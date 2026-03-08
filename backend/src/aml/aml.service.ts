import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

// Subset of OFAC SDN list names for built-in sanctions screening
const OFAC_SDN_NAMES: string[] = [
  'Al-Qaida', 'Taliban', 'Hezbollah', 'Islamic Revolutionary Guard Corps',
  'Osama bin Laden', 'Abu Bakr al-Baghdadi', 'Ayman al-Zawahiri',
  'Joaquin Guzman Loera', 'Vladimir Kuznetsov', 'Kim Jong Un',
  'Nicolás Maduro Moros', 'Bashar al-Assad', 'Muammar Gaddafi',
  'Robert Mugabe', 'Slobodan Milosevic', 'Viktor Bout',
  'Semion Mogilevich', 'Dawood Ibrahim Kaskar', 'Felicien Kabuga',
  'Samantha Lewthwaite', 'Ahmed Khalfan Ghailani',
];

const PEP_TITLE_PATTERNS: string[] = [
  'president', 'prime minister', 'minister', 'governor', 'senator',
  'congressman', 'congresswoman', 'ambassador', 'judge', 'general',
  'admiral', 'chancellor', 'mayor', 'commissioner', 'secretary of state',
  'attorney general', 'speaker of the house', 'chief justice',
  'member of parliament', 'mp', 'mla', 'councillor',
];

@Injectable()
export class AmlService {
  private readonly logger = new Logger(AmlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Simple Levenshtein distance for fuzzy matching.
   */
  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  async screenSanctions(params: { name: string; country?: string; businessId?: string }): Promise<{
    match: boolean;
    riskScore: number;
    matches: Array<{ name: string; similarity: number }>;
  }> {
    const inputName = params.name.toLowerCase().trim();
    const matches: Array<{ name: string; similarity: number }> = [];

    for (const sdnName of OFAC_SDN_NAMES) {
      const sdnLower = sdnName.toLowerCase();

      if (sdnLower.includes(inputName) || inputName.includes(sdnLower)) {
        matches.push({ name: sdnName, similarity: 1.0 });
        continue;
      }

      const maxLen = Math.max(sdnLower.length, inputName.length);
      if (maxLen === 0) continue;
      const distance = this.levenshtein(inputName, sdnLower);
      const similarity = 1 - distance / maxLen;

      // Threshold: 80% similarity counts as a fuzzy match
      if (similarity >= 0.8) {
        matches.push({ name: sdnName, similarity: Math.round(similarity * 100) / 100 });
      }
    }

    const match = matches.length > 0;
    const riskScore = match ? 100 : 0;

    this.logger.log(`Sanctions screening for "${params.name}": ${match ? `MATCH (${matches.length} hit(s))` : 'CLEAR'}`);

    return { match, riskScore, matches };
  }

  async checkPEP(params: { name: string; country?: string }): Promise<{
    isPEP: boolean;
    matchedIndicators: string[];
  }> {
    const inputLower = params.name.toLowerCase().trim();
    const matchedIndicators: string[] = [];

    for (const title of PEP_TITLE_PATTERNS) {
      if (inputLower.includes(title)) {
        matchedIndicators.push(title);
      }
    }

    const isPEP = matchedIndicators.length > 0;
    this.logger.log(`PEP check for "${params.name}": ${isPEP ? `MATCH (${matchedIndicators.join(', ')})` : 'CLEAR'}`);

    return { isPEP, matchedIndicators };
  }

  async screenAdverseMedia(params: { name: string; country?: string }): Promise<{
    hasAdverseMedia: boolean;
    provider: string | null;
  }> {
    const apiKey = this.config.get<string>('COMPLY_ADVANTAGE_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'COMPLY_ADVANTAGE_API_KEY not configured — adverse media screening skipped. ' +
        'Set this env var to enable real ComplyAdvantage integration.',
      );
      return { hasAdverseMedia: false, provider: null };
    }

    // TODO: Integrate with ComplyAdvantage REST API
    // POST https://api.complyadvantage.com/searches
    this.logger.log(`Adverse media screening for "${params.name}" via ComplyAdvantage — integration pending`);
    return { hasAdverseMedia: false, provider: 'complyadvantage' };
  }

  async performAmlCheck(params: {
    name: string;
    country?: string;
    businessId?: string;
    counterpartyId?: string;
  }) {
    const [sanctions, pep, adverseMedia] = await Promise.all([
      this.screenSanctions(params),
      this.checkPEP(params),
      this.screenAdverseMedia(params),
    ]);

    const riskScore = this.calculateRiskScore({
      sanctionsMatch: sanctions.match,
      isPEP: pep.isPEP,
      hasAdverseMedia: adverseMedia.hasAdverseMedia as boolean,
    });

    const passed = riskScore < 70;

    await this.prisma.auditLog.create({
      data: {
        businessId: params.businessId,
        action: 'AML_CHECK',
        entityType: params.counterpartyId ? 'COUNTERPARTY' : 'BUSINESS',
        entityId: params.counterpartyId || params.businessId || 'unknown',
        meta: { name: params.name, riskScore, passed },
      },
    }).catch(() => {});

    return { passed, riskScore, sanctionsMatch: sanctions.match, isPEP: pep.isPEP, hasAdverseMedia: adverseMedia.hasAdverseMedia, details: { sanctions, pep, adverseMedia } };
  }

  private calculateRiskScore(params: { sanctionsMatch: boolean; isPEP: boolean; hasAdverseMedia: boolean }): number {
    let score = 0;
    if (params.sanctionsMatch) score += 100;
    if (params.isPEP) score += 30;
    if (params.hasAdverseMedia) score += 20;
    return Math.min(100, score);
  }
}
