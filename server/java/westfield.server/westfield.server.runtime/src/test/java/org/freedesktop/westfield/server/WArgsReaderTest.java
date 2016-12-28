package org.freedesktop.westfield.server;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.Map;

import static com.google.common.truth.Truth.assertThat;
import static org.mockito.Mockito.mock;

@RunWith(MockitoJUnitRunner.class)
public class WArgsReaderTest {


    @Test
    public void readInt() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4);
        wireMessage.order(ByteOrder.nativeOrder());
        final int wireArg = 123456;
        wireMessage.putInt(wireArg);
        wireMessage.rewind();

        final Map<Integer, WResource<?>> resources = new HashMap<>();

        final WArgsReader wArgsReader = new WArgsReader(wireMessage,
                                                        resources);

        //when
        final int arg = wArgsReader.readInt();

        //then
        assertThat(arg).isEqualTo(wireArg);
    }

    @Test
    public void readFixed() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4);
        wireMessage.order(ByteOrder.nativeOrder());
        final int wireArg = WFixed.valueOf(1234.56)
                                  .rawValue();
        wireMessage.putInt(wireArg);
        wireMessage.rewind();

        final Map<Integer, WResource<?>> resources = new HashMap<>();

        final WArgsReader wArgsReader = new WArgsReader(wireMessage,
                                                        resources);

        //when
        final WFixed arg = wArgsReader.readFixed();

        //then
        assertThat(arg.doubleValue()).isWithin(0.002)
                                     .of(1234.56);
    }

    @Test
    public void readObject() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4);
        wireMessage.order(ByteOrder.nativeOrder());
        final int wireArg = 123456;
        wireMessage.putInt(wireArg);
        wireMessage.rewind();

        final Map<Integer, WResource<?>> resources  = new HashMap<>();
        final WResource<?>               wireObject = mock(WResource.class);
        resources.put(wireArg,
                      wireObject);

        final WArgsReader wArgsReader = new WArgsReader(wireMessage,
                                                        resources);

        //when
        final WResource<?> arg = wArgsReader.readObject();

        //then
        assertThat(arg).isEqualTo(wireObject);
    }

    @Test
    public void readNewObject() throws Exception {

    }

    @Test
    public void readString() throws Exception {

    }

    @Test
    public void readArray() throws Exception {

    }

}