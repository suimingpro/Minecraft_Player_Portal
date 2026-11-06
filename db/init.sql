-- ============================================================
-- Minecraft Player Portal - Database Initialization Script
-- Executed automatically by MariaDB upon first initialization
-- ============================================================

CREATE DATABASE IF NOT EXISTS `minecraft_portal`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `minecraft_portal`;

-- 1. users 表 (身份认证)
CREATE TABLE IF NOT EXISTS `users` (
    `uuid` CHAR(36) NOT NULL COMMENT 'Portal 内部用户 UUID',
    `userid` VARCHAR(64) NULL COMMENT '用户自定义 / 平台 User ID',
    `microsoft_oid` VARCHAR(64) NULL COMMENT 'Microsoft Entra Object ID',
    `microsoft_tid` VARCHAR(64) NULL COMMENT 'Microsoft Entra Tenant ID',
    `email` VARCHAR(255) NULL COMMENT '用户邮箱',
    `display_name` VARCHAR(255) NULL COMMENT '显示名称',
    `groups` TEXT NULL COMMENT '用户所属组(JSON)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `last_login_at` TIMESTAMP NULL DEFAULT NULL COMMENT '最后登录时间',
    `launcher_password` VARCHAR(64) NULL COMMENT '启动器独立密码',

    PRIMARY KEY (`uuid`),
    UNIQUE KEY `uk_microsoft_oid` (`microsoft_oid`),
    UNIQUE KEY `uk_email` (`email`),
    INDEX `idx_userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Portal 用户身份认证信息';

-- 2. players 表 (Minecraft 玩家档案)
CREATE TABLE IF NOT EXISTS `players` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `user_uuid` CHAR(36) NOT NULL COMMENT '关联的 Portal 用户 UUID',
    `player_uuid` CHAR(36) NULL COMMENT 'Minecraft 游戏内 UUID',
    `minecraft_username` VARCHAR(16) NULL COMMENT 'Minecraft 游戏内用户名',
    `skin_url` TEXT NULL COMMENT '皮肤材质 URL',
    `cape_url` TEXT NULL COMMENT '披风材质 URL',
    `skin_model` ENUM('default', 'slim') NOT NULL DEFAULT 'default' COMMENT '皮肤模型: default(经典) / slim(细手臂)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_player_user_uuid` (`user_uuid`),
    UNIQUE KEY `uk_player_uuid` (`player_uuid`),
    UNIQUE KEY `uk_minecraft_username` (`minecraft_username`),

    CONSTRAINT `fk_player_user` FOREIGN KEY (`user_uuid`) REFERENCES `users` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Minecraft 玩家档案（皮肤/UUID）';

-- 3. group_mappings 表 (Microsoft Entra 组与显示名称映射)
CREATE TABLE IF NOT EXISTS `group_mappings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `group_id` VARCHAR(64) NOT NULL COMMENT 'Microsoft Entra Group Object ID (GUID)',
    `group_name` VARCHAR(128) NOT NULL COMMENT '显示名称',
    `group_color` VARCHAR(32) NULL DEFAULT 'blue' COMMENT '标签颜色',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Entra 组与显示标签映射';

-- 4. system_settings 表 (系统配置键值对)
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `key` VARCHAR(64) NOT NULL COMMENT '配置键名',
    `value` TEXT NOT NULL COMMENT '配置值',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_setting_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统全局配置表';

-- 预置系统网站标题
INSERT INTO `system_settings` (`key`, `value`)
VALUES ('app_name', 'Minecraft Player Portal')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- 5. minecraft_servers 表 (Minecraft 服务器管理)
CREATE TABLE IF NOT EXISTS `minecraft_servers` (
    `id` VARCHAR(36) NOT NULL COMMENT '服务器唯一ID (UUID)',
    `name` VARCHAR(128) NOT NULL COMMENT '服务器名称',
    `description` TEXT NULL COMMENT '服务器简介',
    `address` VARCHAR(255) NULL COMMENT '服务器地址 (IP/域名:端口)',
    `icon_url` TEXT NULL COMMENT '服务器头像/图标URL',
    `access_mode` VARCHAR(32) NOT NULL DEFAULT 'all' COMMENT '限制机制: all(全部), whitelist(白名单), blacklist(黑名单)',
    `is_public` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否展示在server页: 1展示, 0不展示',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Minecraft 服务器列表';

-- 6. server_player_rules 表 (服务器玩家白名单/黑名单)
CREATE TABLE IF NOT EXISTS `server_player_rules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `server_id` VARCHAR(36) NOT NULL COMMENT '关联服务器ID',
    `player_uuid` VARCHAR(36) NOT NULL COMMENT 'Minecraft玩家UUID',
    `player_name` VARCHAR(64) NULL COMMENT 'Minecraft玩家用户名',
    `rule_type` VARCHAR(32) NOT NULL DEFAULT 'whitelist' COMMENT '规则类型: whitelist 或 blacklist',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '添加时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_server_player_rule` (`server_id`, `player_uuid`, `rule_type`),
    CONSTRAINT `fk_rule_server` FOREIGN KEY (`server_id`) REFERENCES `minecraft_servers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务器玩家名单规则';
