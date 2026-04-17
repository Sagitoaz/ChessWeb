import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { env } from "./shared/config/env";
import { MongoService } from "./shared/db/mongo.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
  });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  await app.listen(env.port, "0.0.0.0");
  console.log(`[server] NestJS backend listening on port ${env.port}`);

  const mongoService = app.get(MongoService);
  void mongoService.connect().catch((error) => {
    console.error("[server] MongoDB connection failed after startup", error);
  });
}

bootstrap().catch((error) => {
  console.error("[server] Failed to start backend", error);
  process.exit(1);
});
