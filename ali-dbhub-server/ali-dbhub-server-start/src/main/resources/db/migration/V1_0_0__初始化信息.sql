CREATE TABLE IF NOT EXISTS `data_source` (
    `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `gmt_create` datetime NOT NULL COMMENT '创建时间',
    `gmt_modified` datetime NOT NULL COMMENT '修改时间',
    `alias` varchar(128) DEFAULT NULL COMMENT '别名',
    `url` varchar(1024) DEFAULT NULL COMMENT '连接地址',
    `user_name` varchar(128) DEFAULT NULL COMMENT '用户名',
    `password` varchar(256) DEFAULT NULL COMMENT '密码',
    `type` varchar(32) DEFAULT NULL COMMENT '数据库类型',
    `env_type` varchar(32) DEFAULT NULL COMMENT '环境类型',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='数据源连接表'
;

CREATE TABLE IF NOT EXISTS `operation_log` (
    `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    `data_source_id` bigint(20) unsigned NOT NULL COMMENT '数据源连接ID',
    `database_name` varchar(128) DEFAULT NULL COMMENT 'db名称',
    `type` varchar(32) NOT NULL COMMENT '数据库类型',
    `ddl` text DEFAULT NULL COMMENT 'ddl内容',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='我的执行记录表'
;

CREATE TABLE IF NOT EXISTS `operation_saved` (
    `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
    `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    `data_source_id` bigint(20) unsigned NOT NULL COMMENT '数据源连接ID',
    `database_name` varchar(128) DEFAULT NULL COMMENT 'db名称',
    `name` varchar(128) DEFAULT NULL COMMENT '保存名称',
    `type` varchar(32) NOT NULL COMMENT '数据库类型',
    `status` varchar(32) NOT NULL COMMENT 'ddl语句状态:DRAFT/RELEASE',
    `ddl` text DEFAULT NULL COMMENT 'ddl内容',
    `tab_opened` text DEFAULT NULL COMMENT '是否在tab中被打开,y表示打开,n表示未打开',
    PRIMARY KEY (`id`)
    ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='我的保存表'
;

