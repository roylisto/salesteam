CREATE TABLE "wilayah" (
	"kode" varchar(13) PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "wilayah_nama_idx" ON "wilayah" USING btree ("nama");