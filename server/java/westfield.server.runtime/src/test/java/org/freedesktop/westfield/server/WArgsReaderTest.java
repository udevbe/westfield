package org.freedesktop.westfield.server;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.runners.MockitoJUnitRunner;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
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

        final Map<Integer, Resource<?>> resources = new HashMap<>();

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
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
        final int wireArg = Fixed.valueOf(1234.56)
                                  .rawValue();
        wireMessage.putInt(wireArg);
        wireMessage.rewind();

        final Map<Integer, Resource<?>> resources = new HashMap<>();

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final Fixed arg = wArgsReader.readFixed();

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

        final Map<Integer, Resource<?>> resources  = new HashMap<>();
        final Resource<?>               wireObject = mock(Resource.class);
        resources.put(wireArg,
                      wireObject);

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final Resource<?> arg = wArgsReader.readObject();

        //then
        assertThat(arg).isEqualTo(wireObject);
    }

    @Test
    public void readNewObject() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4);
        wireMessage.order(ByteOrder.nativeOrder());
        final int wireArg = 123456;
        wireMessage.putInt(wireArg);
        wireMessage.rewind();

        final Map<Integer, Resource<?>> resources = new HashMap<>();

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final int arg = wArgsReader.readNewObject();

        //then
        assertThat(arg).isEqualTo(wireArg);
    }

    @Test
    public void readString() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4 + 11 + 1);
        wireMessage.order(ByteOrder.nativeOrder());
        final String wireArg = "lorum ipsum";
        wireMessage.putInt(wireArg.length());
        wireMessage.put(wireArg.getBytes(StandardCharsets.US_ASCII));
        wireMessage.put((byte) 0);//padding
        wireMessage.rewind();

        final Map<Integer, Resource<?>> resources = new HashMap<>();

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final String arg = wArgsReader.readString();

        //then
        assertThat(arg).isEqualTo(wireArg);
    }

    @Test
    public void readArray() throws Exception {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4 + 5 + 3);
        wireMessage.order(ByteOrder.nativeOrder());
        final byte[] wireArg = {11, 22, 33, 44, 55};
        wireMessage.putInt(wireArg.length);
        wireMessage.put(wireArg);
        wireMessage.put((byte) 0);//padding
        wireMessage.put((byte) 0);//padding
        wireMessage.put((byte) 0);//padding
        wireMessage.rewind();

        final Map<Integer, Resource<?>> resources = new HashMap<>();

        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final ByteBuffer arg = wArgsReader.readArray();

        //then
        final byte[] argValue = new byte[5];
        arg.get(argValue);
        assertThat(argValue).isEqualTo(wireArg);
    }

    @Test
    public void readAll() {
        //given
        final ByteBuffer wireMessage = ByteBuffer.allocate(4 + 5 + 3 +//array
                                                           4 + 11 + 1 + //string
                                                           4 + //new object
                                                           4 + //object
                                                           4 + //fixed
                                                           4 + //int
                                                           0);

        //array
        wireMessage.order(ByteOrder.nativeOrder());
        final byte[] wireArg0 = {11, 22, 33, 44, 55};
        wireMessage.putInt(wireArg0.length);
        wireMessage.put(wireArg0);
        wireMessage.put((byte) 0);//padding
        wireMessage.put((byte) 0);//padding
        wireMessage.put((byte) 0);//padding

        //string
        final String wireArg1 = "lorum ipsum";
        wireMessage.putInt(wireArg1.length());
        wireMessage.put(wireArg1.getBytes(StandardCharsets.US_ASCII));
        wireMessage.put((byte) 0);//padding

        //new object
        final int wireArg2 = 12345;
        wireMessage.putInt(wireArg2);

        //object
        final int wireArg3 = 123456;
        wireMessage.putInt(wireArg3);
        final Map<Integer, Resource<?>> resources  = new HashMap<>();
        final Resource<?>               wireObject = mock(Resource.class);
        resources.put(wireArg3,
                      wireObject);

        //fixed
        final int wireArg4 = Fixed.valueOf(1234.56)
                                   .rawValue();
        wireMessage.putInt(wireArg4);

        //int
        final int wireArg5 = 1234;
        wireMessage.putInt(wireArg5);

        wireMessage.rewind();
        final ArgsReader wArgsReader = new ArgsReader(wireMessage,
                                                      resources);

        //when
        final ByteBuffer  arg0 = wArgsReader.readArray();
        final String      arg1 = wArgsReader.readString();
        final int         arg2 = wArgsReader.readNewObject();
        final Resource<?> arg3 = wArgsReader.readObject();
        final Fixed       arg4 = wArgsReader.readFixed();
        final int         arg5 = wArgsReader.readInt();

        //then

        //array
        final byte[] argValue = new byte[5];
        arg0.get(argValue);
        assertThat(argValue).isEqualTo(wireArg0);

        //string
        assertThat(arg1).isEqualTo(wireArg1);

        //new object
        assertThat(arg2).isEqualTo(wireArg2);

        //object
        assertThat(arg3).isEqualTo(wireObject);

        //fixed
        assertThat(arg4.doubleValue()).isWithin(0.002)
                                      .of(1234.56);

        //int
        assertThat(arg5).isEqualTo(wireArg5);
    }

}