package org.freedesktop.westfield.server;


import javax.websocket.MessageHandler;
import java.nio.ByteBuffer;

@FunctionalInterface
public interface BlobMessageHandler extends MessageHandler.Whole<ByteBuffer> {
}
