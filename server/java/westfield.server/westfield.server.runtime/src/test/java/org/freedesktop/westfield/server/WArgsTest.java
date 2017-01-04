package org.freedesktop.westfield.server;

import com.google.common.truth.Truth;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

import static com.google.common.truth.Truth.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class WArgsTest {

    @Mock
    private WResource<?> wResource;

    @Test
    public void toWireMessage() throws Exception {
        //given
        final int resourceId = 123;
        when(this.wResource.getId()).thenReturn(resourceId);
        final WClient client = mock(WClient.class);
        when(this.wResource.getClient()).thenReturn(client);
        final int opcode = 456;
        final WArgs wArgs = new WArgs(this.wResource,
                                      opcode);
        final int          intArg        = 987654;
        final String       stringArg     = "lorum ipsum";
        final WResource<?> resourceArg   = mock(WResource.class);
        final int          argResourceId = 987;
        when(resourceArg.getId()).thenReturn(argResourceId);
        final ByteBuffer byteBufferArg = ByteBuffer.wrap(new byte[]{11, 22, 33, 44, 55});
        final WFixed     fixedArg      = WFixed.valueOf(123.45);

        wArgs.arg(intArg)
             .arg(stringArg)
             .arg(resourceArg)
             .arg(byteBufferArg)
             .arg(fixedArg);

        //when
        wArgs.send();

        //then
        final ArgumentCaptor<ByteBuffer> argumentCaptor = ArgumentCaptor.forClass(ByteBuffer.class);
        verify(client).marshall(argumentCaptor.capture());
        final ByteBuffer wireMessage = argumentCaptor.getValue();
        assertThat(wireMessage.capacity()).isEqualTo(8 +//object+size+opcode
                                                     4 +//int arg
                                                     4 + 12 +//string arg (size + int aligned chars)
                                                     4 + //resource arg (object id)
                                                     4 + 8 + //bytebufferArg (size + int aligned bytes)
                                                     4 + //fixedArg
                                                     0
                                                    );
        final byte[] buffer = new byte[wireMessage.capacity()];
        wireMessage.get(buffer);

        final ByteBuffer assertionBuffer = ByteBuffer.allocate(buffer.length);
        assertionBuffer.order(ByteOrder.LITTLE_ENDIAN);
        assertionBuffer.putInt(resourceId);
        assertionBuffer.putShort((short) buffer.length);
        assertionBuffer.putShort((short) opcode);
        assertionBuffer.putInt(intArg);
        assertionBuffer.putInt(stringArg.length());
        assertionBuffer.put(stringArg.getBytes(StandardCharsets.US_ASCII));
        assertionBuffer.put((byte) 0);//padding
        assertionBuffer.putInt(argResourceId);
        assertionBuffer.putInt(5);
        assertionBuffer.put(new byte[]{
                11, 22, 33, 44, 55
        });
        assertionBuffer.put((byte) 0);//padding
        assertionBuffer.put((byte) 0);//padding
        assertionBuffer.put((byte) 0);//padding
        assertionBuffer.putInt(fixedArg.rawValue());

        Truth.assertThat(buffer)
             .isEqualTo(assertionBuffer.array());
    }
}