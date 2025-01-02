import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1735823792404 implements MigrationInterface {
    name = 'Migration1735823792404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user" (
                "id" varchar PRIMARY KEY NOT NULL,
                "email" varchar NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "credential" (
                "id" varchar PRIMARY KEY NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "publicKey" varchar NOT NULL,
                "counter" integer NOT NULL,
                "transports" text NOT NULL,
                "userId" varchar
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "temporary_credential" (
                "id" varchar PRIMARY KEY NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "publicKey" varchar NOT NULL,
                "counter" integer NOT NULL,
                "transports" text NOT NULL,
                "userId" varchar,
                CONSTRAINT "FK_51dc2344d47cea3102674c64963" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`
            INSERT INTO "temporary_credential"(
                    "id",
                    "createdAt",
                    "updatedAt",
                    "publicKey",
                    "counter",
                    "transports",
                    "userId"
                )
            SELECT "id",
                "createdAt",
                "updatedAt",
                "publicKey",
                "counter",
                "transports",
                "userId"
            FROM "credential"
        `);
        await queryRunner.query(`
            DROP TABLE "credential"
        `);
        await queryRunner.query(`
            ALTER TABLE "temporary_credential"
                RENAME TO "credential"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "credential"
                RENAME TO "temporary_credential"
        `);
        await queryRunner.query(`
            CREATE TABLE "credential" (
                "id" varchar PRIMARY KEY NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
                "publicKey" varchar NOT NULL,
                "counter" integer NOT NULL,
                "transports" text NOT NULL,
                "userId" varchar
            )
        `);
        await queryRunner.query(`
            INSERT INTO "credential"(
                    "id",
                    "createdAt",
                    "updatedAt",
                    "publicKey",
                    "counter",
                    "transports",
                    "userId"
                )
            SELECT "id",
                "createdAt",
                "updatedAt",
                "publicKey",
                "counter",
                "transports",
                "userId"
            FROM "temporary_credential"
        `);
        await queryRunner.query(`
            DROP TABLE "temporary_credential"
        `);
        await queryRunner.query(`
            DROP TABLE "credential"
        `);
        await queryRunner.query(`
            DROP TABLE "user"
        `);
    }

}
