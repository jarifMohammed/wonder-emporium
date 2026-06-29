import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './src/app.module';
import * as fs from 'fs';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });
  
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('Production-ready NestJS API with Prisma, PostgreSQL, Authentication, Logging, Monitoring, and more.')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', description: 'Enter JWT access token', in: 'header' },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('metrics', 'Metrics and monitoring endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
  await app.close();
  console.log('OpenAPI JSON generated at ./openapi.json');
}

generateSwagger().catch(console.error);
