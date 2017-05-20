package org.freedesktop.westfield.generator.impl;

import com.google.auto.common.BasicAnnotationProcessor;
import com.google.auto.service.AutoService;

import javax.annotation.processing.Processor;
import javax.annotation.processing.SupportedAnnotationTypes;
import javax.annotation.processing.SupportedSourceVersion;
import javax.lang.model.SourceVersion;
import java.util.Collections;

@AutoService(Processor.class)
@SupportedAnnotationTypes({"org.freedesktop.westfield.generator.api.Protocols"})
@SupportedSourceVersion(SourceVersion.RELEASE_8)
public class WestfieldProtocolGenerator extends BasicAnnotationProcessor {

    protected Iterable<? extends ProcessingStep> initSteps() {
        return Collections.singleton(new ProtocolsProcessingStep(this.processingEnv));
    }


}
