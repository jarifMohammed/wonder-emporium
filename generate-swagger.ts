import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './src/app.module';
import * as fs from 'fs';
import * as path from 'path';

const apiDocsDirectory = path.join(process.cwd(), 'docs', 'api');
const openApiPath = path.join(apiDocsDirectory, 'openapi.json');
const postmanPath = path.join(apiDocsDirectory, 'postman-collection.json');

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription(
      'Production-ready NestJS API with Prisma, PostgreSQL, Authentication, Logging, Monitoring, and more.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('metrics', 'Metrics and monitoring endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  fs.mkdirSync(apiDocsDirectory, { recursive: true });
  fs.writeFileSync(openApiPath, JSON.stringify(document, null, 2));
  await app.close();
  console.log(`OpenAPI JSON generated at ${openApiPath}`);

  const Converter = require('openapi-to-postmanv2');
  Converter.convert(
    { type: 'json', data: document },
    { folderStrategy: 'Tags' },
    (err: any, conversionResult: any) => {
      if (!conversionResult.result) {
        console.error('Could not convert', conversionResult.reason);
      } else {
        fs.writeFileSync(
          postmanPath,
          JSON.stringify(conversionResult.output[0].data, null, 2),
        );
        console.log(`Postman collection generated at ${postmanPath}`);
      }
    },
  );
}

generateSwagger().catch(console.error);
