package com.alibaba.dbhub.server.web.api.controller.data.source.request;

import lombok.Data;

/**
 * @author moji
 * @version ConsoleContentRequest.java, v 0.1 2022年10月30日 15:52 moji Exp $
 * @date 2022/10/30
 */
@Data
public class ConsoleConnectRequest extends DataSourceBaseRequest {

    /**
     * 控制台id
     */
    private Long consoleId;
}
