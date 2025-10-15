CREATE TABLE "guesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"guess_direction" smallint NOT NULL,
	"price_at_guess" integer NOT NULL,
	"price_at_resolve" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"resolved_at" timestamp,
	"is_correct" smallint,
	"price_cache_id_at_resolve" integer
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" integer NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_price_cache_id_at_resolve_price_cache_id_fk" FOREIGN KEY ("price_cache_id_at_resolve") REFERENCES "public"."price_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_id_idx" ON "guesses" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "guesses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expires_at_idx" ON "guesses" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "resolved_at_idx" ON "guesses" USING btree ("resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_cleark_idx" ON "players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_idx" ON "price_cache" USING btree ("price");--> statement-breakpoint
CREATE INDEX "fetched_at_idx" ON "price_cache" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "last_updated_at_idx" ON "price_cache" USING btree ("last_updated_at");