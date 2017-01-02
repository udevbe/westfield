package org.freedesktop.westfield.server;

import javax.websocket.MessageHandler;

@FunctionalInterface
public interface StringMessageHandler extends MessageHandler.Whole<String> {
}
