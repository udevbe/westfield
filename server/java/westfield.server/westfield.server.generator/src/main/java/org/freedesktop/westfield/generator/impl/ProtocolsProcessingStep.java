package org.freedesktop.westfield.generator.impl;

import com.google.auto.common.BasicAnnotationProcessor;
import com.google.common.base.CaseFormat;
import com.google.common.collect.SetMultimap;
import com.sun.tools.javac.util.StringUtils;
import org.freedesktop.westfield.generator.api.Protocols;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.Element;
import javax.lang.model.util.SimpleAnnotationValueVisitor8;
import javax.tools.Diagnostic;
import javax.tools.JavaFileObject;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.File;
import java.io.IOException;
import java.lang.annotation.Annotation;
import java.util.Collections;
import java.util.List;
import java.util.Set;

public class ProtocolsProcessingStep implements BasicAnnotationProcessor.ProcessingStep {

    private final ProcessingEnvironment processingEnv;

    ProtocolsProcessingStep(final ProcessingEnvironment processingEnv) {
        this.processingEnv = processingEnv;
    }

    private static class ProtocolsValueVisitor extends SimpleAnnotationValueVisitor8<List<? extends AnnotationValue>, Void> {
        @Override
        protected List<? extends AnnotationValue> defaultAction(final Object o,
                                                                final Void aVoid) {
            throw new AssertionError();
        }

        @Override
        public List<? extends AnnotationValue> visitArray(final List<? extends AnnotationValue> vals,
                                                          final Void aVoid) {
            return vals;
        }
    }

    private static class ProtocolValueVisitor extends SimpleAnnotationValueVisitor8<String, Void> {
        @Override
        protected String defaultAction(final Object o,
                                       final Void aVoid) {
            throw new AssertionError();
        }

        @Override
        public String visitString(final String s,
                                  final Void aVoid) {
            return s;
        }
    }


    @Override
    public Set<? extends Class<? extends Annotation>> annotations() {
        return Collections.singleton(Protocols.class);
    }

    @Override
    public Set<Element> process(final SetMultimap<Class<? extends Annotation>, Element> elementsByAnnotation) {
        elementsByAnnotation.get(Protocols.class)
                            .forEach(element -> {
                                element.getAnnotationMirrors()
                                       .forEach(annotationMirror -> {
                                           annotationMirror.getElementValues()
                                                           .forEach((executableElement, protocolsAnnotationValue) -> {
                                                               if (executableElement.getSimpleName()
                                                                                    .contentEquals("value")) {
                                                                   protocolsAnnotationValue.accept(new ProtocolsValueVisitor(),
                                                                                                   null)
                                                                                           .forEach(protocolAnnotationValue -> {
                                                                                               final String protocolXmlFile = protocolAnnotationValue.accept(new ProtocolValueVisitor(),
                                                                                                                                                             null);
                                                                                               processProtocolXmlFile(protocolXmlFile,
                                                                                                                      element);
                                                                                           });
                                                               }
                                                           });
                                       });
                            });
        return Collections.emptySet();
    }

    private void processProtocolXmlFile(final String protocolXmlFile,
                                        final Element element) {
        try {
            final File                   xmlFile  = new File(protocolXmlFile);
            final DocumentBuilderFactory factory  = DocumentBuilderFactory.newInstance();
            final DocumentBuilder        builder  = factory.newDocumentBuilder();
            final Document               document = builder.parse(xmlFile);
            document.normalize();

            final org.w3c.dom.Element documentElement = document.getDocumentElement();

            final String name    = documentElement.getAttribute("name");
            final String version = documentElement.getAttribute("version");

            this.processingEnv.getMessager()
                              .printMessage(Diagnostic.Kind.NOTE,
                                            String.format("Processing %s version %s using file %s",
                                                          name,
                                                          version,
                                                          protocolXmlFile),
                                            element);

            final NodeList interfaceElements = documentElement.getElementsByTagName("interface");
            for (int i = 0; i < interfaceElements.getLength(); i++) {
                final org.w3c.dom.Element interfaceElement = (org.w3c.dom.Element) interfaceElements.item(i);
                processRequests(interfaceElement,
                                element);
                processEvents(interfaceElement,
                              element);
            }

        }
        catch (ParserConfigurationException | IOException | SAXException e) {
            this.processingEnv.getMessager()
                              .printMessage(Diagnostic.Kind.ERROR,
                                            "Failed to parse protocol xml file. " + e.getMessage(),
                                            element);
            e.printStackTrace();
        }
    }

    private void processEvents(final org.w3c.dom.Element interfaceElement,
                               final Element e) throws IOException {
        final String name    = interfaceElement.getAttribute("name");
        final String version = interfaceElement.getAttribute("version");

        final String className = CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                                                String.format("%s_resource_v%s",
                                                                              name,
                                                                              version));
        final JavaFileObject sourceFile = this.processingEnv.getFiler()
                                                            .createSourceFile(className,
                                                                              e);
    }

    private void processRequests(final org.w3c.dom.Element interfaceElement,
                                 final Element e) throws IOException {
        final String name    = interfaceElement.getAttribute("name");
        final String version = interfaceElement.getAttribute("version");

        final String className = CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL,
                                                                String.format("%s_requests_v%s",
                                                                              name,
                                                                              version));
        final JavaFileObject sourceFile = this.processingEnv.getFiler()
                                                            .createSourceFile(className,
                                                                              e);
    }
}
