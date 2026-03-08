import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Obeam API')
    .setDescription('Cross-border payment infrastructure for African businesses')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Obeam API running at http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
