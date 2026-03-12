-- ============================================================
-- ChessWeb Database DDL Script
-- Generated from: ChessWeb_ERD.puml
-- Target DBMS  : MySQL 8.0+
-- Compatible   : Visual Paradigm (import via File > Import > SQL)
-- Date         : 2026-03-12
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MODULE 1: USER & AUTH
-- ============================================================

CREATE TABLE `users` (
    `id`            BIGINT          NOT NULL AUTO_INCREMENT,
    `username`      VARCHAR(50)     NOT NULL,
    `email`         VARCHAR(100)    NOT NULL,
    `password_hash` VARCHAR(255)    NOT NULL,
    `display_name`  VARCHAR(100)    NULL,
    `bio`           TEXT            NULL,
    `is_active`     BOOLEAN         NOT NULL DEFAULT TRUE,
    `is_verified`   BOOLEAN         NOT NULL DEFAULT FALSE,
    `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       NULL     ON UPDATE CURRENT_TIMESTAMP,
    `last_login_at` TIMESTAMP       NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`),
    UNIQUE KEY `uq_users_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `sessions` (
    `id`               BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT       NOT NULL,
    `token`            VARCHAR(512) NOT NULL,
    `refresh_token`    VARCHAR(512) NULL,
    `ip_address`       VARCHAR(45)  NULL,
    `user_agent`       TEXT         NULL,
    `is_active`        BOOLEAN      NOT NULL DEFAULT TRUE,
    `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at`       TIMESTAMP    NOT NULL,
    `last_activity_at` TIMESTAMP    NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_sessions_token`         (`token`),
    UNIQUE KEY `uq_sessions_refresh_token` (`refresh_token`),
    KEY `idx_sessions_user_id`             (`user_id`),
    KEY `idx_sessions_expires_at`          (`expires_at`),
    CONSTRAINT `fk_sessions_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `profiles` (
    `id`               BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT       NOT NULL,
    `avatar_url`       VARCHAR(500) NULL,
    `avatar_thumbnail` VARCHAR(500) NULL,
    `country`          VARCHAR(5)   NULL,
    `language`         VARCHAR(10)  NULL DEFAULT 'vi',
    `timezone`         VARCHAR(50)  NULL,
    `preferences`      JSON         NULL,
    `social_links`     JSON         NULL,
    `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_profiles_user_id` (`user_id`),
    CONSTRAINT `fk_profiles_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `user_stats` (
    `id`                  BIGINT        NOT NULL AUTO_INCREMENT,
    `user_id`             BIGINT        NOT NULL,
    `total_games`         INT           NOT NULL DEFAULT 0,
    `total_wins`          INT           NOT NULL DEFAULT 0,
    `total_losses`        INT           NOT NULL DEFAULT 0,
    `total_draws`         INT           NOT NULL DEFAULT 0,
    `win_rate`            DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    `longest_win_streak`  INT           NOT NULL DEFAULT 0,
    `current_streak`      INT           NOT NULL DEFAULT 0,
    `total_play_time`     INT           NOT NULL DEFAULT 0 COMMENT 'seconds',
    `last_updated`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_stats_user_id` (`user_id`),
    CONSTRAINT `fk_user_stats_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `ratings` (
    `id`                BIGINT      NOT NULL AUTO_INCREMENT,
    `user_id`           BIGINT      NOT NULL,
    `elo_ranked`        INT         NOT NULL DEFAULT 500,
    `elo_bot`           INT         NOT NULL DEFAULT 500,
    `elo_tournament`    INT         NOT NULL DEFAULT 500,
    `rank_ranked`       VARCHAR(20) NULL,
    `rank_bot`          VARCHAR(20) NULL,
    `rank_tournament`   VARCHAR(20) NULL,
    `peak_elo_ranked`   INT         NOT NULL DEFAULT 500,
    `peak_elo_bot`      INT         NOT NULL DEFAULT 500,
    `peak_elo_tournament` INT       NOT NULL DEFAULT 500,
    `last_updated`      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ratings_user_id` (`user_id`),
    CONSTRAINT `fk_ratings_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `email_verifications` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `user_id`    BIGINT      NOT NULL,
    `token`      VARCHAR(255) NOT NULL,
    `type`       ENUM('verify','reset_password') NOT NULL,
    `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP   NOT NULL,
    `used_at`    TIMESTAMP   NULL,
    `is_used`    BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_email_verif_token` (`token`),
    KEY `idx_email_verif_user_id` (`user_id`),
    CONSTRAINT `fk_email_verif_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- MODULE 2: GAME CORE (Central table cho mọi ván đấu)
-- ============================================================

CREATE TABLE `games` (
    `id`                    BIGINT       NOT NULL AUTO_INCREMENT,
    `white_player_id`       BIGINT       NOT NULL,
    `black_player_id`       BIGINT       NOT NULL,
    `winner_id`             BIGINT       NULL,
    `game_mode`             ENUM('ranked','room','tournament','bot') NOT NULL,
    `result`                ENUM('white_win','black_win','draw','ongoing','cancelled') NOT NULL DEFAULT 'ongoing',
    `end_reason`            ENUM('checkmate','resignation','timeout','draw_agreement','stalemate','afk','disconnect','abandoned') NULL,
    `initial_fen`           VARCHAR(100) NOT NULL DEFAULT 'startpos',
    `current_fen`           VARCHAR(100) NULL,
    `pgn`                   TEXT         NULL,
    `total_moves`           INT          NOT NULL DEFAULT 0,
    `duration_seconds`      INT          NULL,
    `time_control_initial`  INT          NULL COMMENT 'seconds',
    `time_control_increment` INT         NULL COMMENT 'seconds per move',
    `created_at`            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `finished_at`           TIMESTAMP    NULL,
    -- FK to specialized tables (only one non-null per game_mode)
    `ranked_match_id`       BIGINT       NULL,
    `room_id`               BIGINT       NULL,
    `tournament_match_id`   BIGINT       NULL,
    `bot_session_id`        BIGINT       NULL,
    PRIMARY KEY (`id`),
    KEY `idx_games_white_player`   (`white_player_id`),
    KEY `idx_games_black_player`   (`black_player_id`),
    KEY `idx_games_mode`           (`game_mode`),
    KEY `idx_games_result`         (`result`),
    KEY `idx_games_created_at`     (`created_at`),
    CONSTRAINT `fk_games_white_player`
        FOREIGN KEY (`white_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_games_black_player`
        FOREIGN KEY (`black_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_games_winner`
        FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `game_moves` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `game_id`         BIGINT       NOT NULL,
    `ply`             SMALLINT     NOT NULL COMMENT 'half-move number, starts at 1',
    `color`           ENUM('white','black') NOT NULL,
    `from_square`     CHAR(2)      NOT NULL COMMENT 'e.g. e2',
    `to_square`       CHAR(2)      NOT NULL COMMENT 'e.g. e4',
    `piece`           CHAR(1)      NOT NULL COMMENT 'P/N/B/R/Q/K',
    `captured_piece`  CHAR(1)      NULL,
    `promotion_piece` CHAR(1)      NULL,
    `san`             VARCHAR(10)  NOT NULL COMMENT 'Standard Algebraic Notation, e.g. Nf3',
    `uci`             VARCHAR(5)   NULL     COMMENT 'UCI format, e.g. e2e4',
    `fen_after`       VARCHAR(100) NULL,
    `is_check`        BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_checkmate`    BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_castle`       BOOLEAN      NOT NULL DEFAULT FALSE,
    `is_en_passant`   BOOLEAN      NOT NULL DEFAULT FALSE,
    `time_spent_ms`   INT          NULL,
    `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_game_moves_game_ply` (`game_id`, `ply`),
    KEY `idx_game_moves_game_id` (`game_id`),
    CONSTRAINT `fk_game_moves_game_id`
        FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `elo_history` (
    `id`         BIGINT   NOT NULL AUTO_INCREMENT,
    `game_id`    BIGINT   NOT NULL,
    `user_id`    BIGINT   NOT NULL,
    `old_rating` INT      NOT NULL,
    `new_rating` INT      NOT NULL,
    `change`     INT      NOT NULL,
    `game_mode`  ENUM('ranked','tournament','bot') NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_elo_history_user_id`  (`user_id`),
    KEY `idx_elo_history_game_id`  (`game_id`),
    KEY `idx_elo_history_created`  (`created_at`),
    CONSTRAINT `fk_elo_history_game_id`
        FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_elo_history_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- MODULE 3: RANKED
-- ============================================================

CREATE TABLE `ranked_queue` (
    `id`             BIGINT   NOT NULL AUTO_INCREMENT,
    `user_id`        BIGINT   NOT NULL,
    `current_rating` INT      NOT NULL,
    `status`         ENUM('waiting','matched','left') NOT NULL DEFAULT 'waiting',
    `joined_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `matched_at`     TIMESTAMP NULL,
    `left_at`        TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `idx_ranked_queue_user_id` (`user_id`),
    KEY `idx_ranked_queue_status`  (`status`),
    CONSTRAINT `fk_ranked_queue_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `ranked_matches` (
    `id`                       BIGINT   NOT NULL AUTO_INCREMENT,
    `player1_id`               BIGINT   NOT NULL,
    `player2_id`               BIGINT   NOT NULL,
    `winner_id`                BIGINT   NULL,
    `status`                   ENUM('waiting','playing','finished','cancelled') NOT NULL DEFAULT 'waiting',
    `forfeit_reason`           ENUM('afk','disconnect','none') NULL DEFAULT 'none',
    `player1_time_remaining_ms` INT     NULL,
    `player2_time_remaining_ms` INT     NULL,
    `start_time`               TIMESTAMP NULL,
    `end_time`                 TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `idx_ranked_matches_player1`  (`player1_id`),
    KEY `idx_ranked_matches_player2`  (`player2_id`),
    KEY `idx_ranked_matches_status`   (`status`),
    CONSTRAINT `fk_ranked_matches_player1`
        FOREIGN KEY (`player1_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ranked_matches_player2`
        FOREIGN KEY (`player2_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ranked_matches_winner`
        FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `inactivity_timers` (
    `id`               BIGINT    NOT NULL AUTO_INCREMENT,
    `ranked_match_id`  BIGINT    NOT NULL,
    `player_id`        BIGINT    NOT NULL,
    `last_activity_at` TIMESTAMP NOT NULL,
    `max_seconds`      INT       NOT NULL DEFAULT 120,
    `is_expired`       BOOLEAN   NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    KEY `idx_inactivity_match_id`  (`ranked_match_id`),
    KEY `idx_inactivity_player_id` (`player_id`),
    CONSTRAINT `fk_inactivity_ranked_match`
        FOREIGN KEY (`ranked_match_id`) REFERENCES `ranked_matches` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_inactivity_player`
        FOREIGN KEY (`player_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- MODULE 4: ROOMS (FRIEND GAME)
-- ============================================================

CREATE TABLE `rooms` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(10) NOT NULL,
    `host_id`    BIGINT      NOT NULL,
    `guest_id`   BIGINT      NULL,
    `status`     ENUM('open','ready','in_match','closed') NOT NULL DEFAULT 'open',
    `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP   NULL ON UPDATE CURRENT_TIMESTAMP,
    `closed_at`  TIMESTAMP   NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_rooms_code`    (`code`),
    KEY `idx_rooms_host_id`       (`host_id`),
    KEY `idx_rooms_status`        (`status`),
    CONSTRAINT `fk_rooms_host_id`
        FOREIGN KEY (`host_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_rooms_guest_id`
        FOREIGN KEY (`guest_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `room_settings` (
    `id`                BIGINT  NOT NULL AUTO_INCREMENT,
    `room_id`           BIGINT  NOT NULL,
    `time_per_player`   INT     NOT NULL DEFAULT 600  COMMENT 'seconds',
    `increment_per_move` INT    NOT NULL DEFAULT 0    COMMENT 'seconds per move',
    `is_rated`          BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_room_settings_room_id` (`room_id`),
    CONSTRAINT `fk_room_settings_room_id`
        FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- MODULE 5: TOURNAMENT
-- ============================================================

CREATE TABLE `tournaments` (
    `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
    `name`                 VARCHAR(200) NOT NULL,
    `description`          TEXT         NULL,
    `organizer_id`         BIGINT       NOT NULL,
    `status`               ENUM('draft','published','registration','running','completed','cancelled') NOT NULL DEFAULT 'draft',
    `start_time`           TIMESTAMP    NOT NULL,
    `end_time`             TIMESTAMP    NULL,
    `max_participants`     INT          NOT NULL,
    `current_participants` INT          NOT NULL DEFAULT 0,
    `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_tournaments_organizer`  (`organizer_id`),
    KEY `idx_tournaments_status`     (`status`),
    KEY `idx_tournaments_start_time` (`start_time`),
    CONSTRAINT `fk_tournaments_organizer`
        FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_rules` (
    `id`               BIGINT  NOT NULL AUTO_INCREMENT,
    `tournament_id`    BIGINT  NOT NULL,
    `format`           ENUM('single_elimination','double_elimination','round_robin','swiss') NOT NULL,
    `time_control`     INT     NOT NULL DEFAULT 600 COMMENT 'seconds',
    `increment_per_move` INT   NOT NULL DEFAULT 0,
    `rounds_count`     INT     NOT NULL,
    `tiebreak_rules`   TEXT    NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tournament_rules_tid` (`tournament_id`),
    CONSTRAINT `fk_tournament_rules_tid`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_participants` (
    `id`            BIGINT   NOT NULL AUTO_INCREMENT,
    `tournament_id` BIGINT   NOT NULL,
    `user_id`       BIGINT   NOT NULL,
    `status`        ENUM('registered','active','eliminated','withdrawn') NOT NULL DEFAULT 'registered',
    `seed_number`   INT      NULL,
    `registered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `withdrawn_at`  TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tournament_participants` (`tournament_id`, `user_id`),
    KEY `idx_t_participants_user_id`  (`user_id`),
    CONSTRAINT `fk_t_participants_tid`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_t_participants_uid`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_rounds` (
    `id`            BIGINT   NOT NULL AUTO_INCREMENT,
    `tournament_id` BIGINT   NOT NULL,
    `round_number`  INT      NOT NULL,
    `start_time`    TIMESTAMP NULL,
    `end_time`      TIMESTAMP NULL,
    `is_completed`  BOOLEAN  NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tournament_rounds` (`tournament_id`, `round_number`),
    CONSTRAINT `fk_t_rounds_tid`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_pairings` (
    `id`                  BIGINT NOT NULL AUTO_INCREMENT,
    `round_id`            BIGINT NOT NULL,
    `white_player_id`     BIGINT NOT NULL,
    `black_player_id`     BIGINT NOT NULL,
    `tournament_match_id` BIGINT NULL,
    `table_number`        INT    NULL,
    PRIMARY KEY (`id`),
    KEY `idx_t_pairings_round_id`    (`round_id`),
    KEY `idx_t_pairings_white`       (`white_player_id`),
    KEY `idx_t_pairings_black`       (`black_player_id`),
    CONSTRAINT `fk_t_pairings_round`
        FOREIGN KEY (`round_id`) REFERENCES `tournament_rounds` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_t_pairings_white`
        FOREIGN KEY (`white_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_t_pairings_black`
        FOREIGN KEY (`black_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_matches` (
    `id`              BIGINT   NOT NULL AUTO_INCREMENT,
    `tournament_id`   BIGINT   NOT NULL,
    `round_id`        BIGINT   NOT NULL,
    `white_player_id` BIGINT   NOT NULL,
    `black_player_id` BIGINT   NOT NULL,
    `winner_id`       BIGINT   NULL,
    `result`          ENUM('white_win','black_win','draw','ongoing','cancelled') NOT NULL DEFAULT 'ongoing',
    `pgn`             TEXT     NULL,
    `start_time`      TIMESTAMP NULL,
    `end_time`        TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    KEY `idx_t_matches_tournament` (`tournament_id`),
    KEY `idx_t_matches_round`      (`round_id`),
    KEY `idx_t_matches_white`      (`white_player_id`),
    KEY `idx_t_matches_black`      (`black_player_id`),
    CONSTRAINT `fk_t_matches_tid`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_t_matches_round`
        FOREIGN KEY (`round_id`) REFERENCES `tournament_rounds` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_t_matches_white`
        FOREIGN KEY (`white_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_t_matches_black`
        FOREIGN KEY (`black_player_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_t_matches_winner`
        FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `tournament_standings` (
    `id`               BIGINT        NOT NULL AUTO_INCREMENT,
    `tournament_id`    BIGINT        NOT NULL,
    `participant_id`   BIGINT        NOT NULL,
    `rank`             INT           NOT NULL DEFAULT 0,
    `points`           DECIMAL(6,2)  NOT NULL DEFAULT 0.00,
    `wins`             INT           NOT NULL DEFAULT 0,
    `losses`           INT           NOT NULL DEFAULT 0,
    `draws`            INT           NOT NULL DEFAULT 0,
    `buchholz`         DECIMAL(8,2)  NULL,
    `sonneborn_berger` DECIMAL(8,2)  NULL,
    `last_updated`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tournament_standings` (`tournament_id`, `participant_id`),
    KEY `idx_t_standings_participant` (`participant_id`),
    CONSTRAINT `fk_t_standings_tid`
        FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_t_standings_participant`
        FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- MODULE 6: BOT & REPLAY
-- ============================================================

CREATE TABLE `bot_sessions` (
    `id`           BIGINT      NOT NULL AUTO_INCREMENT,
    `user_id`      BIGINT      NOT NULL,
    `difficulty`   TINYINT     NOT NULL COMMENT '1-10',
    `engine`       VARCHAR(50) NOT NULL DEFAULT 'stockfish',
    `depth`        TINYINT     NOT NULL DEFAULT 10,
    `skill_level`  TINYINT     NOT NULL DEFAULT 10 COMMENT '0-20 (Stockfish UCI)',
    `time_limit_ms` INT        NOT NULL DEFAULT 3000,
    `user_color`   ENUM('white','black') NOT NULL DEFAULT 'white',
    `engine_pid`   INT         NULL,
    `is_active`    BOOLEAN     NOT NULL DEFAULT TRUE,
    `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_move_at` TIMESTAMP   NULL,
    PRIMARY KEY (`id`),
    KEY `idx_bot_sessions_user_id`  (`user_id`),
    KEY `idx_bot_sessions_is_active` (`is_active`),
    CONSTRAINT `fk_bot_sessions_user_id`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DEFERRED FOREIGN KEYS (games -> ranked_matches / rooms /
--   tournament_matches / bot_sessions - added after all tables
--   created to avoid circular dependency)
-- ============================================================

ALTER TABLE `games`
    ADD CONSTRAINT `fk_games_ranked_match`
        FOREIGN KEY (`ranked_match_id`) REFERENCES `ranked_matches` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_games_room`
        FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_games_tournament_match`
        FOREIGN KEY (`tournament_match_id`) REFERENCES `tournament_matches` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_games_bot_session`
        FOREIGN KEY (`bot_session_id`) REFERENCES `bot_sessions` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tournament_pairings`
    ADD CONSTRAINT `fk_t_pairings_match`
        FOREIGN KEY (`tournament_match_id`) REFERENCES `tournament_matches` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
