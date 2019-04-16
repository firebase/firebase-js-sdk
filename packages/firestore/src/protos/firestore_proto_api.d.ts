import * as $protobuf from 'protobufjs';
/** Namespace google. */
export namespace google {
  /** Namespace protobuf. */
  namespace protobuf {
    /** Properties of a Timestamp. */
    interface ITimestamp {
      /** Timestamp seconds */
      seconds?: number | null;

      /** Timestamp nanos */
      nanos?: number | null;
    }

    /** Represents a Timestamp. */
    class Timestamp implements ITimestamp {
      /**
       * Constructs a new Timestamp.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.ITimestamp);

      /** Timestamp seconds. */
      public seconds: number;

      /** Timestamp nanos. */
      public nanos: number;
    }

    /** Properties of a FileDescriptorSet. */
    interface IFileDescriptorSet {
      /** FileDescriptorSet file */
      file?: google.protobuf.IFileDescriptorProto[] | null;
    }

    /** Represents a FileDescriptorSet. */
    class FileDescriptorSet implements IFileDescriptorSet {
      /**
       * Constructs a new FileDescriptorSet.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFileDescriptorSet);

      /** FileDescriptorSet file. */
      public file: google.protobuf.IFileDescriptorProto[];
    }

    /** Properties of a FileDescriptorProto. */
    interface IFileDescriptorProto {
      /** FileDescriptorProto name */
      name?: string | null;

      /** FileDescriptorProto package */
      package?: string | null;

      /** FileDescriptorProto dependency */
      dependency?: string[] | null;

      /** FileDescriptorProto publicDependency */
      publicDependency?: number[] | null;

      /** FileDescriptorProto weakDependency */
      weakDependency?: number[] | null;

      /** FileDescriptorProto messageType */
      messageType?: google.protobuf.IDescriptorProto[] | null;

      /** FileDescriptorProto enumType */
      enumType?: google.protobuf.IEnumDescriptorProto[] | null;

      /** FileDescriptorProto service */
      service?: google.protobuf.IServiceDescriptorProto[] | null;

      /** FileDescriptorProto extension */
      extension?: google.protobuf.IFieldDescriptorProto[] | null;

      /** FileDescriptorProto options */
      options?: google.protobuf.IFileOptions | null;

      /** FileDescriptorProto sourceCodeInfo */
      sourceCodeInfo?: google.protobuf.ISourceCodeInfo | null;

      /** FileDescriptorProto syntax */
      syntax?: string | null;
    }

    /** Represents a FileDescriptorProto. */
    class FileDescriptorProto implements IFileDescriptorProto {
      /**
       * Constructs a new FileDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFileDescriptorProto);

      /** FileDescriptorProto name. */
      public name: string;

      /** FileDescriptorProto package. */
      public package: string;

      /** FileDescriptorProto dependency. */
      public dependency: string[];

      /** FileDescriptorProto publicDependency. */
      public publicDependency: number[];

      /** FileDescriptorProto weakDependency. */
      public weakDependency: number[];

      /** FileDescriptorProto messageType. */
      public messageType: google.protobuf.IDescriptorProto[];

      /** FileDescriptorProto enumType. */
      public enumType: google.protobuf.IEnumDescriptorProto[];

      /** FileDescriptorProto service. */
      public service: google.protobuf.IServiceDescriptorProto[];

      /** FileDescriptorProto extension. */
      public extension: google.protobuf.IFieldDescriptorProto[];

      /** FileDescriptorProto options. */
      public options?: google.protobuf.IFileOptions | null;

      /** FileDescriptorProto sourceCodeInfo. */
      public sourceCodeInfo?: google.protobuf.ISourceCodeInfo | null;

      /** FileDescriptorProto syntax. */
      public syntax: string;
    }

    /** Properties of a DescriptorProto. */
    interface IDescriptorProto {
      /** DescriptorProto name */
      name?: string | null;

      /** DescriptorProto field */
      field?: google.protobuf.IFieldDescriptorProto[] | null;

      /** DescriptorProto extension */
      extension?: google.protobuf.IFieldDescriptorProto[] | null;

      /** DescriptorProto nestedType */
      nestedType?: google.protobuf.IDescriptorProto[] | null;

      /** DescriptorProto enumType */
      enumType?: google.protobuf.IEnumDescriptorProto[] | null;

      /** DescriptorProto extensionRange */
      extensionRange?: google.protobuf.DescriptorProto.IExtensionRange[] | null;

      /** DescriptorProto oneofDecl */
      oneofDecl?: google.protobuf.IOneofDescriptorProto[] | null;

      /** DescriptorProto options */
      options?: google.protobuf.IMessageOptions | null;

      /** DescriptorProto reservedRange */
      reservedRange?: google.protobuf.DescriptorProto.IReservedRange[] | null;

      /** DescriptorProto reservedName */
      reservedName?: string[] | null;
    }

    /** Represents a DescriptorProto. */
    class DescriptorProto implements IDescriptorProto {
      /**
       * Constructs a new DescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IDescriptorProto);

      /** DescriptorProto name. */
      public name: string;

      /** DescriptorProto field. */
      public field: google.protobuf.IFieldDescriptorProto[];

      /** DescriptorProto extension. */
      public extension: google.protobuf.IFieldDescriptorProto[];

      /** DescriptorProto nestedType. */
      public nestedType: google.protobuf.IDescriptorProto[];

      /** DescriptorProto enumType. */
      public enumType: google.protobuf.IEnumDescriptorProto[];

      /** DescriptorProto extensionRange. */
      public extensionRange: google.protobuf.DescriptorProto.IExtensionRange[];

      /** DescriptorProto oneofDecl. */
      public oneofDecl: google.protobuf.IOneofDescriptorProto[];

      /** DescriptorProto options. */
      public options?: google.protobuf.IMessageOptions | null;

      /** DescriptorProto reservedRange. */
      public reservedRange: google.protobuf.DescriptorProto.IReservedRange[];

      /** DescriptorProto reservedName. */
      public reservedName: string[];
    }

    namespace DescriptorProto {
      /** Properties of an ExtensionRange. */
      interface IExtensionRange {
        /** ExtensionRange start */
        start?: number | null;

        /** ExtensionRange end */
        end?: number | null;
      }

      /** Represents an ExtensionRange. */
      class ExtensionRange implements IExtensionRange {
        /**
         * Constructs a new ExtensionRange.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: google.protobuf.DescriptorProto.IExtensionRange
        );

        /** ExtensionRange start. */
        public start: number;

        /** ExtensionRange end. */
        public end: number;
      }

      /** Properties of a ReservedRange. */
      interface IReservedRange {
        /** ReservedRange start */
        start?: number | null;

        /** ReservedRange end */
        end?: number | null;
      }

      /** Represents a ReservedRange. */
      class ReservedRange implements IReservedRange {
        /**
         * Constructs a new ReservedRange.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: google.protobuf.DescriptorProto.IReservedRange
        );

        /** ReservedRange start. */
        public start: number;

        /** ReservedRange end. */
        public end: number;
      }
    }

    /** Properties of a FieldDescriptorProto. */
    interface IFieldDescriptorProto {
      /** FieldDescriptorProto name */
      name?: string | null;

      /** FieldDescriptorProto number */
      number?: number | null;

      /** FieldDescriptorProto label */
      label?: google.protobuf.FieldDescriptorProto.Label | null;

      /** FieldDescriptorProto type */
      type?: google.protobuf.FieldDescriptorProto.Type | null;

      /** FieldDescriptorProto typeName */
      typeName?: string | null;

      /** FieldDescriptorProto extendee */
      extendee?: string | null;

      /** FieldDescriptorProto defaultValue */
      defaultValue?: string | null;

      /** FieldDescriptorProto oneofIndex */
      oneofIndex?: number | null;

      /** FieldDescriptorProto jsonName */
      jsonName?: string | null;

      /** FieldDescriptorProto options */
      options?: google.protobuf.IFieldOptions | null;
    }

    /** Represents a FieldDescriptorProto. */
    class FieldDescriptorProto implements IFieldDescriptorProto {
      /**
       * Constructs a new FieldDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFieldDescriptorProto);

      /** FieldDescriptorProto name. */
      public name: string;

      /** FieldDescriptorProto number. */
      public number: number;

      /** FieldDescriptorProto label. */
      public label: google.protobuf.FieldDescriptorProto.Label;

      /** FieldDescriptorProto type. */
      public type: google.protobuf.FieldDescriptorProto.Type;

      /** FieldDescriptorProto typeName. */
      public typeName: string;

      /** FieldDescriptorProto extendee. */
      public extendee: string;

      /** FieldDescriptorProto defaultValue. */
      public defaultValue: string;

      /** FieldDescriptorProto oneofIndex. */
      public oneofIndex: number;

      /** FieldDescriptorProto jsonName. */
      public jsonName: string;

      /** FieldDescriptorProto options. */
      public options?: google.protobuf.IFieldOptions | null;
    }

    namespace FieldDescriptorProto {
      /** Type enum. */
      type Type =
        | 'TYPE_DOUBLE'
        | 'TYPE_FLOAT'
        | 'TYPE_INT64'
        | 'TYPE_UINT64'
        | 'TYPE_INT32'
        | 'TYPE_FIXED64'
        | 'TYPE_FIXED32'
        | 'TYPE_BOOL'
        | 'TYPE_STRING'
        | 'TYPE_GROUP'
        | 'TYPE_MESSAGE'
        | 'TYPE_BYTES'
        | 'TYPE_UINT32'
        | 'TYPE_ENUM'
        | 'TYPE_SFIXED32'
        | 'TYPE_SFIXED64'
        | 'TYPE_SINT32'
        | 'TYPE_SINT64';

      /** Label enum. */
      type Label = 'LABEL_OPTIONAL' | 'LABEL_REQUIRED' | 'LABEL_REPEATED';
    }

    /** Properties of an OneofDescriptorProto. */
    interface IOneofDescriptorProto {
      /** OneofDescriptorProto name */
      name?: string | null;

      /** OneofDescriptorProto options */
      options?: google.protobuf.IOneofOptions | null;
    }

    /** Represents an OneofDescriptorProto. */
    class OneofDescriptorProto implements IOneofDescriptorProto {
      /**
       * Constructs a new OneofDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IOneofDescriptorProto);

      /** OneofDescriptorProto name. */
      public name: string;

      /** OneofDescriptorProto options. */
      public options?: google.protobuf.IOneofOptions | null;
    }

    /** Properties of an EnumDescriptorProto. */
    interface IEnumDescriptorProto {
      /** EnumDescriptorProto name */
      name?: string | null;

      /** EnumDescriptorProto value */
      value?: google.protobuf.IEnumValueDescriptorProto[] | null;

      /** EnumDescriptorProto options */
      options?: google.protobuf.IEnumOptions | null;
    }

    /** Represents an EnumDescriptorProto. */
    class EnumDescriptorProto implements IEnumDescriptorProto {
      /**
       * Constructs a new EnumDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IEnumDescriptorProto);

      /** EnumDescriptorProto name. */
      public name: string;

      /** EnumDescriptorProto value. */
      public value: google.protobuf.IEnumValueDescriptorProto[];

      /** EnumDescriptorProto options. */
      public options?: google.protobuf.IEnumOptions | null;
    }

    /** Properties of an EnumValueDescriptorProto. */
    interface IEnumValueDescriptorProto {
      /** EnumValueDescriptorProto name */
      name?: string | null;

      /** EnumValueDescriptorProto number */
      number?: number | null;

      /** EnumValueDescriptorProto options */
      options?: google.protobuf.IEnumValueOptions | null;
    }

    /** Represents an EnumValueDescriptorProto. */
    class EnumValueDescriptorProto implements IEnumValueDescriptorProto {
      /**
       * Constructs a new EnumValueDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IEnumValueDescriptorProto);

      /** EnumValueDescriptorProto name. */
      public name: string;

      /** EnumValueDescriptorProto number. */
      public number: number;

      /** EnumValueDescriptorProto options. */
      public options?: google.protobuf.IEnumValueOptions | null;
    }

    /** Properties of a ServiceDescriptorProto. */
    interface IServiceDescriptorProto {
      /** ServiceDescriptorProto name */
      name?: string | null;

      /** ServiceDescriptorProto method */
      method?: google.protobuf.IMethodDescriptorProto[] | null;

      /** ServiceDescriptorProto options */
      options?: google.protobuf.IServiceOptions | null;
    }

    /** Represents a ServiceDescriptorProto. */
    class ServiceDescriptorProto implements IServiceDescriptorProto {
      /**
       * Constructs a new ServiceDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IServiceDescriptorProto);

      /** ServiceDescriptorProto name. */
      public name: string;

      /** ServiceDescriptorProto method. */
      public method: google.protobuf.IMethodDescriptorProto[];

      /** ServiceDescriptorProto options. */
      public options?: google.protobuf.IServiceOptions | null;
    }

    /** Properties of a MethodDescriptorProto. */
    interface IMethodDescriptorProto {
      /** MethodDescriptorProto name */
      name?: string | null;

      /** MethodDescriptorProto inputType */
      inputType?: string | null;

      /** MethodDescriptorProto outputType */
      outputType?: string | null;

      /** MethodDescriptorProto options */
      options?: google.protobuf.IMethodOptions | null;

      /** MethodDescriptorProto clientStreaming */
      clientStreaming?: boolean | null;

      /** MethodDescriptorProto serverStreaming */
      serverStreaming?: boolean | null;
    }

    /** Represents a MethodDescriptorProto. */
    class MethodDescriptorProto implements IMethodDescriptorProto {
      /**
       * Constructs a new MethodDescriptorProto.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IMethodDescriptorProto);

      /** MethodDescriptorProto name. */
      public name: string;

      /** MethodDescriptorProto inputType. */
      public inputType: string;

      /** MethodDescriptorProto outputType. */
      public outputType: string;

      /** MethodDescriptorProto options. */
      public options?: google.protobuf.IMethodOptions | null;

      /** MethodDescriptorProto clientStreaming. */
      public clientStreaming: boolean;

      /** MethodDescriptorProto serverStreaming. */
      public serverStreaming: boolean;
    }

    /** Properties of a FileOptions. */
    interface IFileOptions {
      /** FileOptions javaPackage */
      javaPackage?: string | null;

      /** FileOptions javaOuterClassname */
      javaOuterClassname?: string | null;

      /** FileOptions javaMultipleFiles */
      javaMultipleFiles?: boolean | null;

      /** FileOptions javaGenerateEqualsAndHash */
      javaGenerateEqualsAndHash?: boolean | null;

      /** FileOptions javaStringCheckUtf8 */
      javaStringCheckUtf8?: boolean | null;

      /** FileOptions optimizeFor */
      optimizeFor?: google.protobuf.FileOptions.OptimizeMode | null;

      /** FileOptions goPackage */
      goPackage?: string | null;

      /** FileOptions ccGenericServices */
      ccGenericServices?: boolean | null;

      /** FileOptions javaGenericServices */
      javaGenericServices?: boolean | null;

      /** FileOptions pyGenericServices */
      pyGenericServices?: boolean | null;

      /** FileOptions deprecated */
      deprecated?: boolean | null;

      /** FileOptions ccEnableArenas */
      ccEnableArenas?: boolean | null;

      /** FileOptions objcClassPrefix */
      objcClassPrefix?: string | null;

      /** FileOptions csharpNamespace */
      csharpNamespace?: string | null;

      /** FileOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents a FileOptions. */
    class FileOptions implements IFileOptions {
      /**
       * Constructs a new FileOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFileOptions);

      /** FileOptions javaPackage. */
      public javaPackage: string;

      /** FileOptions javaOuterClassname. */
      public javaOuterClassname: string;

      /** FileOptions javaMultipleFiles. */
      public javaMultipleFiles: boolean;

      /** FileOptions javaGenerateEqualsAndHash. */
      public javaGenerateEqualsAndHash: boolean;

      /** FileOptions javaStringCheckUtf8. */
      public javaStringCheckUtf8: boolean;

      /** FileOptions optimizeFor. */
      public optimizeFor: google.protobuf.FileOptions.OptimizeMode;

      /** FileOptions goPackage. */
      public goPackage: string;

      /** FileOptions ccGenericServices. */
      public ccGenericServices: boolean;

      /** FileOptions javaGenericServices. */
      public javaGenericServices: boolean;

      /** FileOptions pyGenericServices. */
      public pyGenericServices: boolean;

      /** FileOptions deprecated. */
      public deprecated: boolean;

      /** FileOptions ccEnableArenas. */
      public ccEnableArenas: boolean;

      /** FileOptions objcClassPrefix. */
      public objcClassPrefix: string;

      /** FileOptions csharpNamespace. */
      public csharpNamespace: string;

      /** FileOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    namespace FileOptions {
      /** OptimizeMode enum. */
      type OptimizeMode = 'SPEED' | 'CODE_SIZE' | 'LITE_RUNTIME';
    }

    /** Properties of a MessageOptions. */
    interface IMessageOptions {
      /** MessageOptions messageSetWireFormat */
      messageSetWireFormat?: boolean | null;

      /** MessageOptions noStandardDescriptorAccessor */
      noStandardDescriptorAccessor?: boolean | null;

      /** MessageOptions deprecated */
      deprecated?: boolean | null;

      /** MessageOptions mapEntry */
      mapEntry?: boolean | null;

      /** MessageOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents a MessageOptions. */
    class MessageOptions implements IMessageOptions {
      /**
       * Constructs a new MessageOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IMessageOptions);

      /** MessageOptions messageSetWireFormat. */
      public messageSetWireFormat: boolean;

      /** MessageOptions noStandardDescriptorAccessor. */
      public noStandardDescriptorAccessor: boolean;

      /** MessageOptions deprecated. */
      public deprecated: boolean;

      /** MessageOptions mapEntry. */
      public mapEntry: boolean;

      /** MessageOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of a FieldOptions. */
    interface IFieldOptions {
      /** FieldOptions ctype */
      ctype?: google.protobuf.FieldOptions.CType | null;

      /** FieldOptions packed */
      packed?: boolean | null;

      /** FieldOptions jstype */
      jstype?: google.protobuf.FieldOptions.JSType | null;

      /** FieldOptions lazy */
      lazy?: boolean | null;

      /** FieldOptions deprecated */
      deprecated?: boolean | null;

      /** FieldOptions weak */
      weak?: boolean | null;

      /** FieldOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents a FieldOptions. */
    class FieldOptions implements IFieldOptions {
      /**
       * Constructs a new FieldOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFieldOptions);

      /** FieldOptions ctype. */
      public ctype: google.protobuf.FieldOptions.CType;

      /** FieldOptions packed. */
      public packed: boolean;

      /** FieldOptions jstype. */
      public jstype: google.protobuf.FieldOptions.JSType;

      /** FieldOptions lazy. */
      public lazy: boolean;

      /** FieldOptions deprecated. */
      public deprecated: boolean;

      /** FieldOptions weak. */
      public weak: boolean;

      /** FieldOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    namespace FieldOptions {
      /** CType enum. */
      type CType = 'STRING' | 'CORD' | 'STRING_PIECE';

      /** JSType enum. */
      type JSType = 'JS_NORMAL' | 'JS_STRING' | 'JS_NUMBER';
    }

    /** Properties of an OneofOptions. */
    interface IOneofOptions {
      /** OneofOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents an OneofOptions. */
    class OneofOptions implements IOneofOptions {
      /**
       * Constructs a new OneofOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IOneofOptions);

      /** OneofOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of an EnumOptions. */
    interface IEnumOptions {
      /** EnumOptions allowAlias */
      allowAlias?: boolean | null;

      /** EnumOptions deprecated */
      deprecated?: boolean | null;

      /** EnumOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents an EnumOptions. */
    class EnumOptions implements IEnumOptions {
      /**
       * Constructs a new EnumOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IEnumOptions);

      /** EnumOptions allowAlias. */
      public allowAlias: boolean;

      /** EnumOptions deprecated. */
      public deprecated: boolean;

      /** EnumOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of an EnumValueOptions. */
    interface IEnumValueOptions {
      /** EnumValueOptions deprecated */
      deprecated?: boolean | null;

      /** EnumValueOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents an EnumValueOptions. */
    class EnumValueOptions implements IEnumValueOptions {
      /**
       * Constructs a new EnumValueOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IEnumValueOptions);

      /** EnumValueOptions deprecated. */
      public deprecated: boolean;

      /** EnumValueOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of a ServiceOptions. */
    interface IServiceOptions {
      /** ServiceOptions deprecated */
      deprecated?: boolean | null;

      /** ServiceOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;
    }

    /** Represents a ServiceOptions. */
    class ServiceOptions implements IServiceOptions {
      /**
       * Constructs a new ServiceOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IServiceOptions);

      /** ServiceOptions deprecated. */
      public deprecated: boolean;

      /** ServiceOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of a MethodOptions. */
    interface IMethodOptions {
      /** MethodOptions deprecated */
      deprecated?: boolean | null;

      /** MethodOptions uninterpretedOption */
      uninterpretedOption?: google.protobuf.IUninterpretedOption[] | null;

      /** MethodOptions .google.api.http */
      '.google.api.http'?: google.api.IHttpRule | null;
    }

    /** Represents a MethodOptions. */
    class MethodOptions implements IMethodOptions {
      /**
       * Constructs a new MethodOptions.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IMethodOptions);

      /** MethodOptions deprecated. */
      public deprecated: boolean;

      /** MethodOptions uninterpretedOption. */
      public uninterpretedOption: google.protobuf.IUninterpretedOption[];
    }

    /** Properties of an UninterpretedOption. */
    interface IUninterpretedOption {
      /** UninterpretedOption name */
      name?: google.protobuf.UninterpretedOption.INamePart[] | null;

      /** UninterpretedOption identifierValue */
      identifierValue?: string | null;

      /** UninterpretedOption positiveIntValue */
      positiveIntValue?: number | null;

      /** UninterpretedOption negativeIntValue */
      negativeIntValue?: number | null;

      /** UninterpretedOption doubleValue */
      doubleValue?: number | null;

      /** UninterpretedOption stringValue */
      stringValue?: Uint8Array | null;

      /** UninterpretedOption aggregateValue */
      aggregateValue?: string | null;
    }

    /** Represents an UninterpretedOption. */
    class UninterpretedOption implements IUninterpretedOption {
      /**
       * Constructs a new UninterpretedOption.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IUninterpretedOption);

      /** UninterpretedOption name. */
      public name: google.protobuf.UninterpretedOption.INamePart[];

      /** UninterpretedOption identifierValue. */
      public identifierValue: string;

      /** UninterpretedOption positiveIntValue. */
      public positiveIntValue: number;

      /** UninterpretedOption negativeIntValue. */
      public negativeIntValue: number;

      /** UninterpretedOption doubleValue. */
      public doubleValue: number;

      /** UninterpretedOption stringValue. */
      public stringValue: Uint8Array;

      /** UninterpretedOption aggregateValue. */
      public aggregateValue: string;
    }

    namespace UninterpretedOption {
      /** Properties of a NamePart. */
      interface INamePart {
        /** NamePart namePart */
        namePart: string;

        /** NamePart isExtension */
        isExtension: boolean;
      }

      /** Represents a NamePart. */
      class NamePart implements INamePart {
        /**
         * Constructs a new NamePart.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.protobuf.UninterpretedOption.INamePart);

        /** NamePart namePart. */
        public namePart: string;

        /** NamePart isExtension. */
        public isExtension: boolean;
      }
    }

    /** Properties of a SourceCodeInfo. */
    interface ISourceCodeInfo {
      /** SourceCodeInfo location */
      location?: google.protobuf.SourceCodeInfo.ILocation[] | null;
    }

    /** Represents a SourceCodeInfo. */
    class SourceCodeInfo implements ISourceCodeInfo {
      /**
       * Constructs a new SourceCodeInfo.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.ISourceCodeInfo);

      /** SourceCodeInfo location. */
      public location: google.protobuf.SourceCodeInfo.ILocation[];
    }

    namespace SourceCodeInfo {
      /** Properties of a Location. */
      interface ILocation {
        /** Location path */
        path?: number[] | null;

        /** Location span */
        span?: number[] | null;

        /** Location leadingComments */
        leadingComments?: string | null;

        /** Location trailingComments */
        trailingComments?: string | null;

        /** Location leadingDetachedComments */
        leadingDetachedComments?: string[] | null;
      }

      /** Represents a Location. */
      class Location implements ILocation {
        /**
         * Constructs a new Location.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.protobuf.SourceCodeInfo.ILocation);

        /** Location path. */
        public path: number[];

        /** Location span. */
        public span: number[];

        /** Location leadingComments. */
        public leadingComments: string;

        /** Location trailingComments. */
        public trailingComments: string;

        /** Location leadingDetachedComments. */
        public leadingDetachedComments: string[];
      }
    }

    /** Properties of a GeneratedCodeInfo. */
    interface IGeneratedCodeInfo {
      /** GeneratedCodeInfo annotation */
      annotation?: google.protobuf.GeneratedCodeInfo.IAnnotation[] | null;
    }

    /** Represents a GeneratedCodeInfo. */
    class GeneratedCodeInfo implements IGeneratedCodeInfo {
      /**
       * Constructs a new GeneratedCodeInfo.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IGeneratedCodeInfo);

      /** GeneratedCodeInfo annotation. */
      public annotation: google.protobuf.GeneratedCodeInfo.IAnnotation[];
    }

    namespace GeneratedCodeInfo {
      /** Properties of an Annotation. */
      interface IAnnotation {
        /** Annotation path */
        path?: number[] | null;

        /** Annotation sourceFile */
        sourceFile?: string | null;

        /** Annotation begin */
        begin?: number | null;

        /** Annotation end */
        end?: number | null;
      }

      /** Represents an Annotation. */
      class Annotation implements IAnnotation {
        /**
         * Constructs a new Annotation.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.protobuf.GeneratedCodeInfo.IAnnotation);

        /** Annotation path. */
        public path: number[];

        /** Annotation sourceFile. */
        public sourceFile: string;

        /** Annotation begin. */
        public begin: number;

        /** Annotation end. */
        public end: number;
      }
    }

    /** Properties of a Struct. */
    interface IStruct {
      /** Struct fields */
      fields?: { [k: string]: google.protobuf.IValue } | null;
    }

    /** Represents a Struct. */
    class Struct implements IStruct {
      /**
       * Constructs a new Struct.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IStruct);

      /** Struct fields. */
      public fields: { [k: string]: google.protobuf.IValue };
    }

    /** Properties of a Value. */
    interface IValue {
      /** Value nullValue */
      nullValue?: google.protobuf.NullValue | null;

      /** Value numberValue */
      numberValue?: number | null;

      /** Value stringValue */
      stringValue?: string | null;

      /** Value boolValue */
      boolValue?: boolean | null;

      /** Value structValue */
      structValue?: google.protobuf.IStruct | null;

      /** Value listValue */
      listValue?: google.protobuf.IListValue | null;
    }

    /** Represents a Value. */
    class Value implements IValue {
      /**
       * Constructs a new Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IValue);

      /** Value nullValue. */
      public nullValue: google.protobuf.NullValue;

      /** Value numberValue. */
      public numberValue: number;

      /** Value stringValue. */
      public stringValue: string;

      /** Value boolValue. */
      public boolValue: boolean;

      /** Value structValue. */
      public structValue?: google.protobuf.IStruct | null;

      /** Value listValue. */
      public listValue?: google.protobuf.IListValue | null;

      /** Value kind. */
      public kind?:
        | 'nullValue'
        | 'numberValue'
        | 'stringValue'
        | 'boolValue'
        | 'structValue'
        | 'listValue';
    }

    /** NullValue enum. */
    type NullValue = 'NULL_VALUE';

    /** Properties of a ListValue. */
    interface IListValue {
      /** ListValue values */
      values?: google.protobuf.IValue[] | null;
    }

    /** Represents a ListValue. */
    class ListValue implements IListValue {
      /**
       * Constructs a new ListValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IListValue);

      /** ListValue values. */
      public values: google.protobuf.IValue[];
    }

    /** Properties of an Empty. */
    interface IEmpty {}

    /** Represents an Empty. */
    class Empty implements IEmpty {
      /**
       * Constructs a new Empty.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IEmpty);
    }

    /** Properties of a DoubleValue. */
    interface IDoubleValue {
      /** DoubleValue value */
      value?: number | null;
    }

    /** Represents a DoubleValue. */
    class DoubleValue implements IDoubleValue {
      /**
       * Constructs a new DoubleValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IDoubleValue);

      /** DoubleValue value. */
      public value: number;
    }

    /** Properties of a FloatValue. */
    interface IFloatValue {
      /** FloatValue value */
      value?: number | null;
    }

    /** Represents a FloatValue. */
    class FloatValue implements IFloatValue {
      /**
       * Constructs a new FloatValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IFloatValue);

      /** FloatValue value. */
      public value: number;
    }

    /** Properties of an Int64Value. */
    interface IInt64Value {
      /** Int64Value value */
      value?: number | null;
    }

    /** Represents an Int64Value. */
    class Int64Value implements IInt64Value {
      /**
       * Constructs a new Int64Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IInt64Value);

      /** Int64Value value. */
      public value: number;
    }

    /** Properties of a UInt64Value. */
    interface IUInt64Value {
      /** UInt64Value value */
      value?: number | null;
    }

    /** Represents a UInt64Value. */
    class UInt64Value implements IUInt64Value {
      /**
       * Constructs a new UInt64Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IUInt64Value);

      /** UInt64Value value. */
      public value: number;
    }

    /** Properties of an Int32Value. */
    interface IInt32Value {
      /** Int32Value value */
      value?: number | null;
    }

    /** Represents an Int32Value. */
    class Int32Value implements IInt32Value {
      /**
       * Constructs a new Int32Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IInt32Value);

      /** Int32Value value. */
      public value: number;
    }

    /** Properties of a UInt32Value. */
    interface IUInt32Value {
      /** UInt32Value value */
      value?: number | null;
    }

    /** Represents a UInt32Value. */
    class UInt32Value implements IUInt32Value {
      /**
       * Constructs a new UInt32Value.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IUInt32Value);

      /** UInt32Value value. */
      public value: number;
    }

    /** Properties of a BoolValue. */
    interface IBoolValue {
      /** BoolValue value */
      value?: boolean | null;
    }

    /** Represents a BoolValue. */
    class BoolValue implements IBoolValue {
      /**
       * Constructs a new BoolValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IBoolValue);

      /** BoolValue value. */
      public value: boolean;
    }

    /** Properties of a StringValue. */
    interface IStringValue {
      /** StringValue value */
      value?: string | null;
    }

    /** Represents a StringValue. */
    class StringValue implements IStringValue {
      /**
       * Constructs a new StringValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IStringValue);

      /** StringValue value. */
      public value: string;
    }

    /** Properties of a BytesValue. */
    interface IBytesValue {
      /** BytesValue value */
      value?: Uint8Array | null;
    }

    /** Represents a BytesValue. */
    class BytesValue implements IBytesValue {
      /**
       * Constructs a new BytesValue.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IBytesValue);

      /** BytesValue value. */
      public value: Uint8Array;
    }

    /** Properties of an Any. */
    interface IAny {
      /** Any type_url */
      type_url?: string | null;

      /** Any value */
      value?: Uint8Array | null;
    }

    /** Represents an Any. */
    class Any implements IAny {
      /**
       * Constructs a new Any.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.protobuf.IAny);

      /** Any type_url. */
      public type_url: string;

      /** Any value. */
      public value: Uint8Array;
    }
  }

  /** Namespace firestore. */
  namespace firestore {
    /** Namespace v1. */
    namespace v1 {
      /** Properties of a DocumentMask. */
      interface IDocumentMask {
        /** DocumentMask fieldPaths */
        fieldPaths?: string[] | null;
      }

      /** Represents a DocumentMask. */
      class DocumentMask implements IDocumentMask {
        /**
         * Constructs a new DocumentMask.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocumentMask);

        /** DocumentMask fieldPaths. */
        public fieldPaths: string[];
      }

      /** Properties of a Precondition. */
      interface IPrecondition {
        /** Precondition exists */
        exists?: boolean | null;

        /** Precondition updateTime */
        updateTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a Precondition. */
      class Precondition implements IPrecondition {
        /**
         * Constructs a new Precondition.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IPrecondition);

        /** Precondition exists. */
        public exists: boolean;

        /** Precondition updateTime. */
        public updateTime?: google.protobuf.ITimestamp | null;

        /** Precondition conditionType. */
        public conditionType?: 'exists' | 'updateTime';
      }

      /** Properties of a TransactionOptions. */
      interface ITransactionOptions {
        /** TransactionOptions readOnly */
        readOnly?: google.firestore.v1.TransactionOptions.IReadOnly | null;

        /** TransactionOptions readWrite */
        readWrite?: google.firestore.v1.TransactionOptions.IReadWrite | null;
      }

      /** Represents a TransactionOptions. */
      class TransactionOptions implements ITransactionOptions {
        /**
         * Constructs a new TransactionOptions.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ITransactionOptions);

        /** TransactionOptions readOnly. */
        public readOnly?: google.firestore.v1.TransactionOptions.IReadOnly | null;

        /** TransactionOptions readWrite. */
        public readWrite?: google.firestore.v1.TransactionOptions.IReadWrite | null;

        /** TransactionOptions mode. */
        public mode?: 'readOnly' | 'readWrite';
      }

      namespace TransactionOptions {
        /** Properties of a ReadWrite. */
        interface IReadWrite {
          /** ReadWrite retryTransaction */
          retryTransaction?: Uint8Array | null;
        }

        /** Represents a ReadWrite. */
        class ReadWrite implements IReadWrite {
          /**
           * Constructs a new ReadWrite.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.TransactionOptions.IReadWrite
          );

          /** ReadWrite retryTransaction. */
          public retryTransaction: Uint8Array;
        }

        /** Properties of a ReadOnly. */
        interface IReadOnly {
          /** ReadOnly readTime */
          readTime?: google.protobuf.ITimestamp | null;
        }

        /** Represents a ReadOnly. */
        class ReadOnly implements IReadOnly {
          /**
           * Constructs a new ReadOnly.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.TransactionOptions.IReadOnly
          );

          /** ReadOnly readTime. */
          public readTime?: google.protobuf.ITimestamp | null;

          /** ReadOnly consistencySelector. */
          public consistencySelector?: 'readTime';
        }
      }

      /** Properties of a Document. */
      interface IDocument {
        /** Document name */
        name?: string | null;

        /** Document fields */
        fields?: { [k: string]: google.firestore.v1.IValue } | null;

        /** Document createTime */
        createTime?: google.protobuf.ITimestamp | null;

        /** Document updateTime */
        updateTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a Document. */
      class Document implements IDocument {
        /**
         * Constructs a new Document.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocument);

        /** Document name. */
        public name: string;

        /** Document fields. */
        public fields: { [k: string]: google.firestore.v1.IValue };

        /** Document createTime. */
        public createTime?: google.protobuf.ITimestamp | null;

        /** Document updateTime. */
        public updateTime?: google.protobuf.ITimestamp | null;
      }

      /** Properties of a Value. */
      interface IValue {
        /** Value nullValue */
        nullValue?: google.protobuf.NullValue | null;

        /** Value booleanValue */
        booleanValue?: boolean | null;

        /** Value integerValue */
        integerValue?: number | null;

        /** Value doubleValue */
        doubleValue?: number | null;

        /** Value timestampValue */
        timestampValue?: google.protobuf.ITimestamp | null;

        /** Value stringValue */
        stringValue?: string | null;

        /** Value bytesValue */
        bytesValue?: Uint8Array | null;

        /** Value referenceValue */
        referenceValue?: string | null;

        /** Value geoPointValue */
        geoPointValue?: google.type.ILatLng | null;

        /** Value arrayValue */
        arrayValue?: google.firestore.v1.IArrayValue | null;

        /** Value mapValue */
        mapValue?: google.firestore.v1.IMapValue | null;
      }

      /** Represents a Value. */
      class Value implements IValue {
        /**
         * Constructs a new Value.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IValue);

        /** Value nullValue. */
        public nullValue: google.protobuf.NullValue;

        /** Value booleanValue. */
        public booleanValue: boolean;

        /** Value integerValue. */
        public integerValue: number;

        /** Value doubleValue. */
        public doubleValue: number;

        /** Value timestampValue. */
        public timestampValue?: google.protobuf.ITimestamp | null;

        /** Value stringValue. */
        public stringValue: string;

        /** Value bytesValue. */
        public bytesValue: Uint8Array;

        /** Value referenceValue. */
        public referenceValue: string;

        /** Value geoPointValue. */
        public geoPointValue?: google.type.ILatLng | null;

        /** Value arrayValue. */
        public arrayValue?: google.firestore.v1.IArrayValue | null;

        /** Value mapValue. */
        public mapValue?: google.firestore.v1.IMapValue | null;

        /** Value valueType. */
        public valueType?:
          | 'nullValue'
          | 'booleanValue'
          | 'integerValue'
          | 'doubleValue'
          | 'timestampValue'
          | 'stringValue'
          | 'bytesValue'
          | 'referenceValue'
          | 'geoPointValue'
          | 'arrayValue'
          | 'mapValue';
      }

      /** Properties of an ArrayValue. */
      interface IArrayValue {
        /** ArrayValue values */
        values?: google.firestore.v1.IValue[] | null;
      }

      /** Represents an ArrayValue. */
      class ArrayValue implements IArrayValue {
        /**
         * Constructs a new ArrayValue.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IArrayValue);

        /** ArrayValue values. */
        public values: google.firestore.v1.IValue[];
      }

      /** Properties of a MapValue. */
      interface IMapValue {
        /** MapValue fields */
        fields?: { [k: string]: google.firestore.v1.IValue } | null;
      }

      /** Represents a MapValue. */
      class MapValue implements IMapValue {
        /**
         * Constructs a new MapValue.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IMapValue);

        /** MapValue fields. */
        public fields: { [k: string]: google.firestore.v1.IValue };
      }

      /** Represents a Firestore */
      class Firestore extends $protobuf.rpc.Service {
        /**
         * Constructs a new Firestore service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(
          rpcImpl: $protobuf.RPCImpl,
          requestDelimited?: boolean,
          responseDelimited?: boolean
        );

        /**
         * Calls GetDocument.
         * @param request GetDocumentRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and Document
         */
        public getDocument(
          request: google.firestore.v1.IGetDocumentRequest,
          callback: google.firestore.v1.Firestore.GetDocumentCallback
        ): void;

        /**
         * Calls GetDocument.
         * @param request GetDocumentRequest message or plain object
         * @returns Promise
         */
        public getDocument(
          request: google.firestore.v1.IGetDocumentRequest
        ): Promise<google.firestore.v1.Document>;

        /**
         * Calls ListDocuments.
         * @param request ListDocumentsRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ListDocumentsResponse
         */
        public listDocuments(
          request: google.firestore.v1.IListDocumentsRequest,
          callback: google.firestore.v1.Firestore.ListDocumentsCallback
        ): void;

        /**
         * Calls ListDocuments.
         * @param request ListDocumentsRequest message or plain object
         * @returns Promise
         */
        public listDocuments(
          request: google.firestore.v1.IListDocumentsRequest
        ): Promise<google.firestore.v1.ListDocumentsResponse>;

        /**
         * Calls CreateDocument.
         * @param request CreateDocumentRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and Document
         */
        public createDocument(
          request: google.firestore.v1.ICreateDocumentRequest,
          callback: google.firestore.v1.Firestore.CreateDocumentCallback
        ): void;

        /**
         * Calls CreateDocument.
         * @param request CreateDocumentRequest message or plain object
         * @returns Promise
         */
        public createDocument(
          request: google.firestore.v1.ICreateDocumentRequest
        ): Promise<google.firestore.v1.Document>;

        /**
         * Calls UpdateDocument.
         * @param request UpdateDocumentRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and Document
         */
        public updateDocument(
          request: google.firestore.v1.IUpdateDocumentRequest,
          callback: google.firestore.v1.Firestore.UpdateDocumentCallback
        ): void;

        /**
         * Calls UpdateDocument.
         * @param request UpdateDocumentRequest message or plain object
         * @returns Promise
         */
        public updateDocument(
          request: google.firestore.v1.IUpdateDocumentRequest
        ): Promise<google.firestore.v1.Document>;

        /**
         * Calls DeleteDocument.
         * @param request DeleteDocumentRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and Empty
         */
        public deleteDocument(
          request: google.firestore.v1.IDeleteDocumentRequest,
          callback: google.firestore.v1.Firestore.DeleteDocumentCallback
        ): void;

        /**
         * Calls DeleteDocument.
         * @param request DeleteDocumentRequest message or plain object
         * @returns Promise
         */
        public deleteDocument(
          request: google.firestore.v1.IDeleteDocumentRequest
        ): Promise<google.protobuf.Empty>;

        /**
         * Calls BatchGetDocuments.
         * @param request BatchGetDocumentsRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and BatchGetDocumentsResponse
         */
        public batchGetDocuments(
          request: google.firestore.v1.IBatchGetDocumentsRequest,
          callback: google.firestore.v1.Firestore.BatchGetDocumentsCallback
        ): void;

        /**
         * Calls BatchGetDocuments.
         * @param request BatchGetDocumentsRequest message or plain object
         * @returns Promise
         */
        public batchGetDocuments(
          request: google.firestore.v1.IBatchGetDocumentsRequest
        ): Promise<google.firestore.v1.BatchGetDocumentsResponse>;

        /**
         * Calls BeginTransaction.
         * @param request BeginTransactionRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and BeginTransactionResponse
         */
        public beginTransaction(
          request: google.firestore.v1.IBeginTransactionRequest,
          callback: google.firestore.v1.Firestore.BeginTransactionCallback
        ): void;

        /**
         * Calls BeginTransaction.
         * @param request BeginTransactionRequest message or plain object
         * @returns Promise
         */
        public beginTransaction(
          request: google.firestore.v1.IBeginTransactionRequest
        ): Promise<google.firestore.v1.BeginTransactionResponse>;

        /**
         * Calls Commit.
         * @param request CommitRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and CommitResponse
         */
        public commit(
          request: google.firestore.v1.ICommitRequest,
          callback: google.firestore.v1.Firestore.CommitCallback
        ): void;

        /**
         * Calls Commit.
         * @param request CommitRequest message or plain object
         * @returns Promise
         */
        public commit(
          request: google.firestore.v1.ICommitRequest
        ): Promise<google.firestore.v1.CommitResponse>;

        /**
         * Calls Rollback.
         * @param request RollbackRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and Empty
         */
        public rollback(
          request: google.firestore.v1.IRollbackRequest,
          callback: google.firestore.v1.Firestore.RollbackCallback
        ): void;

        /**
         * Calls Rollback.
         * @param request RollbackRequest message or plain object
         * @returns Promise
         */
        public rollback(
          request: google.firestore.v1.IRollbackRequest
        ): Promise<google.protobuf.Empty>;

        /**
         * Calls RunQuery.
         * @param request RunQueryRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and RunQueryResponse
         */
        public runQuery(
          request: google.firestore.v1.IRunQueryRequest,
          callback: google.firestore.v1.Firestore.RunQueryCallback
        ): void;

        /**
         * Calls RunQuery.
         * @param request RunQueryRequest message or plain object
         * @returns Promise
         */
        public runQuery(
          request: google.firestore.v1.IRunQueryRequest
        ): Promise<google.firestore.v1.RunQueryResponse>;

        /**
         * Calls Write.
         * @param request WriteRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and WriteResponse
         */
        public write(
          request: google.firestore.v1.IWriteRequest,
          callback: google.firestore.v1.Firestore.WriteCallback
        ): void;

        /**
         * Calls Write.
         * @param request WriteRequest message or plain object
         * @returns Promise
         */
        public write(
          request: google.firestore.v1.IWriteRequest
        ): Promise<google.firestore.v1.WriteResponse>;

        /**
         * Calls Listen.
         * @param request ListenRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ListenResponse
         */
        public listen(
          request: google.firestore.v1.IListenRequest,
          callback: google.firestore.v1.Firestore.ListenCallback
        ): void;

        /**
         * Calls Listen.
         * @param request ListenRequest message or plain object
         * @returns Promise
         */
        public listen(
          request: google.firestore.v1.IListenRequest
        ): Promise<google.firestore.v1.ListenResponse>;

        /**
         * Calls ListCollectionIds.
         * @param request ListCollectionIdsRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and ListCollectionIdsResponse
         */
        public listCollectionIds(
          request: google.firestore.v1.IListCollectionIdsRequest,
          callback: google.firestore.v1.Firestore.ListCollectionIdsCallback
        ): void;

        /**
         * Calls ListCollectionIds.
         * @param request ListCollectionIdsRequest message or plain object
         * @returns Promise
         */
        public listCollectionIds(
          request: google.firestore.v1.IListCollectionIdsRequest
        ): Promise<google.firestore.v1.ListCollectionIdsResponse>;
      }

      namespace Firestore {
        /**
         * Callback as used by {@link google.firestore.v1.Firestore#getDocument}.
         * @param error Error, if any
         * @param [response] Document
         */
        type GetDocumentCallback = (
          error: Error | null,
          response?: google.firestore.v1.Document
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#listDocuments}.
         * @param error Error, if any
         * @param [response] ListDocumentsResponse
         */
        type ListDocumentsCallback = (
          error: Error | null,
          response?: google.firestore.v1.ListDocumentsResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#createDocument}.
         * @param error Error, if any
         * @param [response] Document
         */
        type CreateDocumentCallback = (
          error: Error | null,
          response?: google.firestore.v1.Document
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#updateDocument}.
         * @param error Error, if any
         * @param [response] Document
         */
        type UpdateDocumentCallback = (
          error: Error | null,
          response?: google.firestore.v1.Document
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#deleteDocument}.
         * @param error Error, if any
         * @param [response] Empty
         */
        type DeleteDocumentCallback = (
          error: Error | null,
          response?: google.protobuf.Empty
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#batchGetDocuments}.
         * @param error Error, if any
         * @param [response] BatchGetDocumentsResponse
         */
        type BatchGetDocumentsCallback = (
          error: Error | null,
          response?: google.firestore.v1.BatchGetDocumentsResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#beginTransaction}.
         * @param error Error, if any
         * @param [response] BeginTransactionResponse
         */
        type BeginTransactionCallback = (
          error: Error | null,
          response?: google.firestore.v1.BeginTransactionResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#commit}.
         * @param error Error, if any
         * @param [response] CommitResponse
         */
        type CommitCallback = (
          error: Error | null,
          response?: google.firestore.v1.CommitResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#rollback}.
         * @param error Error, if any
         * @param [response] Empty
         */
        type RollbackCallback = (
          error: Error | null,
          response?: google.protobuf.Empty
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#runQuery}.
         * @param error Error, if any
         * @param [response] RunQueryResponse
         */
        type RunQueryCallback = (
          error: Error | null,
          response?: google.firestore.v1.RunQueryResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#write}.
         * @param error Error, if any
         * @param [response] WriteResponse
         */
        type WriteCallback = (
          error: Error | null,
          response?: google.firestore.v1.WriteResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#listen}.
         * @param error Error, if any
         * @param [response] ListenResponse
         */
        type ListenCallback = (
          error: Error | null,
          response?: google.firestore.v1.ListenResponse
        ) => void;

        /**
         * Callback as used by {@link google.firestore.v1.Firestore#listCollectionIds}.
         * @param error Error, if any
         * @param [response] ListCollectionIdsResponse
         */
        type ListCollectionIdsCallback = (
          error: Error | null,
          response?: google.firestore.v1.ListCollectionIdsResponse
        ) => void;
      }

      /** Properties of a GetDocumentRequest. */
      interface IGetDocumentRequest {
        /** GetDocumentRequest name */
        name?: string | null;

        /** GetDocumentRequest mask */
        mask?: google.firestore.v1.IDocumentMask | null;

        /** GetDocumentRequest transaction */
        transaction?: Uint8Array | null;

        /** GetDocumentRequest readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a GetDocumentRequest. */
      class GetDocumentRequest implements IGetDocumentRequest {
        /**
         * Constructs a new GetDocumentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IGetDocumentRequest);

        /** GetDocumentRequest name. */
        public name: string;

        /** GetDocumentRequest mask. */
        public mask?: google.firestore.v1.IDocumentMask | null;

        /** GetDocumentRequest transaction. */
        public transaction: Uint8Array;

        /** GetDocumentRequest readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** GetDocumentRequest consistencySelector. */
        public consistencySelector?: 'transaction' | 'readTime';
      }

      /** Properties of a ListDocumentsRequest. */
      interface IListDocumentsRequest {
        /** ListDocumentsRequest parent */
        parent?: string | null;

        /** ListDocumentsRequest collectionId */
        collectionId?: string | null;

        /** ListDocumentsRequest pageSize */
        pageSize?: number | null;

        /** ListDocumentsRequest pageToken */
        pageToken?: string | null;

        /** ListDocumentsRequest orderBy */
        orderBy?: string | null;

        /** ListDocumentsRequest mask */
        mask?: google.firestore.v1.IDocumentMask | null;

        /** ListDocumentsRequest transaction */
        transaction?: Uint8Array | null;

        /** ListDocumentsRequest readTime */
        readTime?: google.protobuf.ITimestamp | null;

        /** ListDocumentsRequest showMissing */
        showMissing?: boolean | null;
      }

      /** Represents a ListDocumentsRequest. */
      class ListDocumentsRequest implements IListDocumentsRequest {
        /**
         * Constructs a new ListDocumentsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IListDocumentsRequest);

        /** ListDocumentsRequest parent. */
        public parent: string;

        /** ListDocumentsRequest collectionId. */
        public collectionId: string;

        /** ListDocumentsRequest pageSize. */
        public pageSize: number;

        /** ListDocumentsRequest pageToken. */
        public pageToken: string;

        /** ListDocumentsRequest orderBy. */
        public orderBy: string;

        /** ListDocumentsRequest mask. */
        public mask?: google.firestore.v1.IDocumentMask | null;

        /** ListDocumentsRequest transaction. */
        public transaction: Uint8Array;

        /** ListDocumentsRequest readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** ListDocumentsRequest showMissing. */
        public showMissing: boolean;

        /** ListDocumentsRequest consistencySelector. */
        public consistencySelector?: 'transaction' | 'readTime';
      }

      /** Properties of a ListDocumentsResponse. */
      interface IListDocumentsResponse {
        /** ListDocumentsResponse documents */
        documents?: google.firestore.v1.IDocument[] | null;

        /** ListDocumentsResponse nextPageToken */
        nextPageToken?: string | null;
      }

      /** Represents a ListDocumentsResponse. */
      class ListDocumentsResponse implements IListDocumentsResponse {
        /**
         * Constructs a new ListDocumentsResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IListDocumentsResponse);

        /** ListDocumentsResponse documents. */
        public documents: google.firestore.v1.IDocument[];

        /** ListDocumentsResponse nextPageToken. */
        public nextPageToken: string;
      }

      /** Properties of a CreateDocumentRequest. */
      interface ICreateDocumentRequest {
        /** CreateDocumentRequest parent */
        parent?: string | null;

        /** CreateDocumentRequest collectionId */
        collectionId?: string | null;

        /** CreateDocumentRequest documentId */
        documentId?: string | null;

        /** CreateDocumentRequest document */
        document?: google.firestore.v1.IDocument | null;

        /** CreateDocumentRequest mask */
        mask?: google.firestore.v1.IDocumentMask | null;
      }

      /** Represents a CreateDocumentRequest. */
      class CreateDocumentRequest implements ICreateDocumentRequest {
        /**
         * Constructs a new CreateDocumentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ICreateDocumentRequest);

        /** CreateDocumentRequest parent. */
        public parent: string;

        /** CreateDocumentRequest collectionId. */
        public collectionId: string;

        /** CreateDocumentRequest documentId. */
        public documentId: string;

        /** CreateDocumentRequest document. */
        public document?: google.firestore.v1.IDocument | null;

        /** CreateDocumentRequest mask. */
        public mask?: google.firestore.v1.IDocumentMask | null;
      }

      /** Properties of an UpdateDocumentRequest. */
      interface IUpdateDocumentRequest {
        /** UpdateDocumentRequest document */
        document?: google.firestore.v1.IDocument | null;

        /** UpdateDocumentRequest updateMask */
        updateMask?: google.firestore.v1.IDocumentMask | null;

        /** UpdateDocumentRequest mask */
        mask?: google.firestore.v1.IDocumentMask | null;

        /** UpdateDocumentRequest currentDocument */
        currentDocument?: google.firestore.v1.IPrecondition | null;
      }

      /** Represents an UpdateDocumentRequest. */
      class UpdateDocumentRequest implements IUpdateDocumentRequest {
        /**
         * Constructs a new UpdateDocumentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IUpdateDocumentRequest);

        /** UpdateDocumentRequest document. */
        public document?: google.firestore.v1.IDocument | null;

        /** UpdateDocumentRequest updateMask. */
        public updateMask?: google.firestore.v1.IDocumentMask | null;

        /** UpdateDocumentRequest mask. */
        public mask?: google.firestore.v1.IDocumentMask | null;

        /** UpdateDocumentRequest currentDocument. */
        public currentDocument?: google.firestore.v1.IPrecondition | null;
      }

      /** Properties of a DeleteDocumentRequest. */
      interface IDeleteDocumentRequest {
        /** DeleteDocumentRequest name */
        name?: string | null;

        /** DeleteDocumentRequest currentDocument */
        currentDocument?: google.firestore.v1.IPrecondition | null;
      }

      /** Represents a DeleteDocumentRequest. */
      class DeleteDocumentRequest implements IDeleteDocumentRequest {
        /**
         * Constructs a new DeleteDocumentRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDeleteDocumentRequest);

        /** DeleteDocumentRequest name. */
        public name: string;

        /** DeleteDocumentRequest currentDocument. */
        public currentDocument?: google.firestore.v1.IPrecondition | null;
      }

      /** Properties of a BatchGetDocumentsRequest. */
      interface IBatchGetDocumentsRequest {
        /** BatchGetDocumentsRequest database */
        database?: string | null;

        /** BatchGetDocumentsRequest documents */
        documents?: string[] | null;

        /** BatchGetDocumentsRequest mask */
        mask?: google.firestore.v1.IDocumentMask | null;

        /** BatchGetDocumentsRequest transaction */
        transaction?: Uint8Array | null;

        /** BatchGetDocumentsRequest newTransaction */
        newTransaction?: google.firestore.v1.ITransactionOptions | null;

        /** BatchGetDocumentsRequest readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a BatchGetDocumentsRequest. */
      class BatchGetDocumentsRequest implements IBatchGetDocumentsRequest {
        /**
         * Constructs a new BatchGetDocumentsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IBatchGetDocumentsRequest);

        /** BatchGetDocumentsRequest database. */
        public database: string;

        /** BatchGetDocumentsRequest documents. */
        public documents: string[];

        /** BatchGetDocumentsRequest mask. */
        public mask?: google.firestore.v1.IDocumentMask | null;

        /** BatchGetDocumentsRequest transaction. */
        public transaction: Uint8Array;

        /** BatchGetDocumentsRequest newTransaction. */
        public newTransaction?: google.firestore.v1.ITransactionOptions | null;

        /** BatchGetDocumentsRequest readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** BatchGetDocumentsRequest consistencySelector. */
        public consistencySelector?:
          | 'transaction'
          | 'newTransaction'
          | 'readTime';
      }

      /** Properties of a BatchGetDocumentsResponse. */
      interface IBatchGetDocumentsResponse {
        /** BatchGetDocumentsResponse found */
        found?: google.firestore.v1.IDocument | null;

        /** BatchGetDocumentsResponse missing */
        missing?: string | null;

        /** BatchGetDocumentsResponse transaction */
        transaction?: Uint8Array | null;

        /** BatchGetDocumentsResponse readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a BatchGetDocumentsResponse. */
      class BatchGetDocumentsResponse implements IBatchGetDocumentsResponse {
        /**
         * Constructs a new BatchGetDocumentsResponse.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: google.firestore.v1.IBatchGetDocumentsResponse
        );

        /** BatchGetDocumentsResponse found. */
        public found?: google.firestore.v1.IDocument | null;

        /** BatchGetDocumentsResponse missing. */
        public missing: string;

        /** BatchGetDocumentsResponse transaction. */
        public transaction: Uint8Array;

        /** BatchGetDocumentsResponse readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** BatchGetDocumentsResponse result. */
        public result?: 'found' | 'missing';
      }

      /** Properties of a BeginTransactionRequest. */
      interface IBeginTransactionRequest {
        /** BeginTransactionRequest database */
        database?: string | null;

        /** BeginTransactionRequest options */
        options?: google.firestore.v1.ITransactionOptions | null;
      }

      /** Represents a BeginTransactionRequest. */
      class BeginTransactionRequest implements IBeginTransactionRequest {
        /**
         * Constructs a new BeginTransactionRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IBeginTransactionRequest);

        /** BeginTransactionRequest database. */
        public database: string;

        /** BeginTransactionRequest options. */
        public options?: google.firestore.v1.ITransactionOptions | null;
      }

      /** Properties of a BeginTransactionResponse. */
      interface IBeginTransactionResponse {
        /** BeginTransactionResponse transaction */
        transaction?: Uint8Array | null;
      }

      /** Represents a BeginTransactionResponse. */
      class BeginTransactionResponse implements IBeginTransactionResponse {
        /**
         * Constructs a new BeginTransactionResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IBeginTransactionResponse);

        /** BeginTransactionResponse transaction. */
        public transaction: Uint8Array;
      }

      /** Properties of a CommitRequest. */
      interface ICommitRequest {
        /** CommitRequest database */
        database?: string | null;

        /** CommitRequest writes */
        writes?: google.firestore.v1.IWrite[] | null;

        /** CommitRequest transaction */
        transaction?: Uint8Array | null;
      }

      /** Represents a CommitRequest. */
      class CommitRequest implements ICommitRequest {
        /**
         * Constructs a new CommitRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ICommitRequest);

        /** CommitRequest database. */
        public database: string;

        /** CommitRequest writes. */
        public writes: google.firestore.v1.IWrite[];

        /** CommitRequest transaction. */
        public transaction: Uint8Array;
      }

      /** Properties of a CommitResponse. */
      interface ICommitResponse {
        /** CommitResponse writeResults */
        writeResults?: google.firestore.v1.IWriteResult[] | null;

        /** CommitResponse commitTime */
        commitTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a CommitResponse. */
      class CommitResponse implements ICommitResponse {
        /**
         * Constructs a new CommitResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ICommitResponse);

        /** CommitResponse writeResults. */
        public writeResults: google.firestore.v1.IWriteResult[];

        /** CommitResponse commitTime. */
        public commitTime?: google.protobuf.ITimestamp | null;
      }

      /** Properties of a RollbackRequest. */
      interface IRollbackRequest {
        /** RollbackRequest database */
        database?: string | null;

        /** RollbackRequest transaction */
        transaction?: Uint8Array | null;
      }

      /** Represents a RollbackRequest. */
      class RollbackRequest implements IRollbackRequest {
        /**
         * Constructs a new RollbackRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IRollbackRequest);

        /** RollbackRequest database. */
        public database: string;

        /** RollbackRequest transaction. */
        public transaction: Uint8Array;
      }

      /** Properties of a RunQueryRequest. */
      interface IRunQueryRequest {
        /** RunQueryRequest parent */
        parent?: string | null;

        /** RunQueryRequest structuredQuery */
        structuredQuery?: google.firestore.v1.IStructuredQuery | null;

        /** RunQueryRequest transaction */
        transaction?: Uint8Array | null;

        /** RunQueryRequest newTransaction */
        newTransaction?: google.firestore.v1.ITransactionOptions | null;

        /** RunQueryRequest readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a RunQueryRequest. */
      class RunQueryRequest implements IRunQueryRequest {
        /**
         * Constructs a new RunQueryRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IRunQueryRequest);

        /** RunQueryRequest parent. */
        public parent: string;

        /** RunQueryRequest structuredQuery. */
        public structuredQuery?: google.firestore.v1.IStructuredQuery | null;

        /** RunQueryRequest transaction. */
        public transaction: Uint8Array;

        /** RunQueryRequest newTransaction. */
        public newTransaction?: google.firestore.v1.ITransactionOptions | null;

        /** RunQueryRequest readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** RunQueryRequest queryType. */
        public queryType?: 'structuredQuery';

        /** RunQueryRequest consistencySelector. */
        public consistencySelector?:
          | 'transaction'
          | 'newTransaction'
          | 'readTime';
      }

      /** Properties of a RunQueryResponse. */
      interface IRunQueryResponse {
        /** RunQueryResponse transaction */
        transaction?: Uint8Array | null;

        /** RunQueryResponse document */
        document?: google.firestore.v1.IDocument | null;

        /** RunQueryResponse readTime */
        readTime?: google.protobuf.ITimestamp | null;

        /** RunQueryResponse skippedResults */
        skippedResults?: number | null;
      }

      /** Represents a RunQueryResponse. */
      class RunQueryResponse implements IRunQueryResponse {
        /**
         * Constructs a new RunQueryResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IRunQueryResponse);

        /** RunQueryResponse transaction. */
        public transaction: Uint8Array;

        /** RunQueryResponse document. */
        public document?: google.firestore.v1.IDocument | null;

        /** RunQueryResponse readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** RunQueryResponse skippedResults. */
        public skippedResults: number;
      }

      /** Properties of a WriteRequest. */
      interface IWriteRequest {
        /** WriteRequest database */
        database?: string | null;

        /** WriteRequest streamId */
        streamId?: string | null;

        /** WriteRequest writes */
        writes?: google.firestore.v1.IWrite[] | null;

        /** WriteRequest streamToken */
        streamToken?: Uint8Array | null;

        /** WriteRequest labels */
        labels?: { [k: string]: string } | null;
      }

      /** Represents a WriteRequest. */
      class WriteRequest implements IWriteRequest {
        /**
         * Constructs a new WriteRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IWriteRequest);

        /** WriteRequest database. */
        public database: string;

        /** WriteRequest streamId. */
        public streamId: string;

        /** WriteRequest writes. */
        public writes: google.firestore.v1.IWrite[];

        /** WriteRequest streamToken. */
        public streamToken: Uint8Array;

        /** WriteRequest labels. */
        public labels: { [k: string]: string };
      }

      /** Properties of a WriteResponse. */
      interface IWriteResponse {
        /** WriteResponse streamId */
        streamId?: string | null;

        /** WriteResponse streamToken */
        streamToken?: Uint8Array | null;

        /** WriteResponse writeResults */
        writeResults?: google.firestore.v1.IWriteResult[] | null;

        /** WriteResponse commitTime */
        commitTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a WriteResponse. */
      class WriteResponse implements IWriteResponse {
        /**
         * Constructs a new WriteResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IWriteResponse);

        /** WriteResponse streamId. */
        public streamId: string;

        /** WriteResponse streamToken. */
        public streamToken: Uint8Array;

        /** WriteResponse writeResults. */
        public writeResults: google.firestore.v1.IWriteResult[];

        /** WriteResponse commitTime. */
        public commitTime?: google.protobuf.ITimestamp | null;
      }

      /** Properties of a ListenRequest. */
      interface IListenRequest {
        /** ListenRequest database */
        database?: string | null;

        /** ListenRequest addTarget */
        addTarget?: google.firestore.v1.ITarget | null;

        /** ListenRequest removeTarget */
        removeTarget?: number | null;

        /** ListenRequest labels */
        labels?: { [k: string]: string } | null;
      }

      /** Represents a ListenRequest. */
      class ListenRequest implements IListenRequest {
        /**
         * Constructs a new ListenRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IListenRequest);

        /** ListenRequest database. */
        public database: string;

        /** ListenRequest addTarget. */
        public addTarget?: google.firestore.v1.ITarget | null;

        /** ListenRequest removeTarget. */
        public removeTarget: number;

        /** ListenRequest labels. */
        public labels: { [k: string]: string };

        /** ListenRequest targetChange. */
        public targetChange?: 'addTarget' | 'removeTarget';
      }

      /** Properties of a ListenResponse. */
      interface IListenResponse {
        /** ListenResponse targetChange */
        targetChange?: google.firestore.v1.ITargetChange | null;

        /** ListenResponse documentChange */
        documentChange?: google.firestore.v1.IDocumentChange | null;

        /** ListenResponse documentDelete */
        documentDelete?: google.firestore.v1.IDocumentDelete | null;

        /** ListenResponse documentRemove */
        documentRemove?: google.firestore.v1.IDocumentRemove | null;

        /** ListenResponse filter */
        filter?: google.firestore.v1.IExistenceFilter | null;
      }

      /** Represents a ListenResponse. */
      class ListenResponse implements IListenResponse {
        /**
         * Constructs a new ListenResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IListenResponse);

        /** ListenResponse targetChange. */
        public targetChange?: google.firestore.v1.ITargetChange | null;

        /** ListenResponse documentChange. */
        public documentChange?: google.firestore.v1.IDocumentChange | null;

        /** ListenResponse documentDelete. */
        public documentDelete?: google.firestore.v1.IDocumentDelete | null;

        /** ListenResponse documentRemove. */
        public documentRemove?: google.firestore.v1.IDocumentRemove | null;

        /** ListenResponse filter. */
        public filter?: google.firestore.v1.IExistenceFilter | null;

        /** ListenResponse responseType. */
        public responseType?:
          | 'targetChange'
          | 'documentChange'
          | 'documentDelete'
          | 'documentRemove'
          | 'filter';
      }

      /** Properties of a Target. */
      interface ITarget {
        /** Target query */
        query?: google.firestore.v1.Target.IQueryTarget | null;

        /** Target documents */
        documents?: google.firestore.v1.Target.IDocumentsTarget | null;

        /** Target resumeToken */
        resumeToken?: Uint8Array | null;

        /** Target readTime */
        readTime?: google.protobuf.ITimestamp | null;

        /** Target targetId */
        targetId?: number | null;

        /** Target once */
        once?: boolean | null;
      }

      /** Represents a Target. */
      class Target implements ITarget {
        /**
         * Constructs a new Target.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ITarget);

        /** Target query. */
        public query?: google.firestore.v1.Target.IQueryTarget | null;

        /** Target documents. */
        public documents?: google.firestore.v1.Target.IDocumentsTarget | null;

        /** Target resumeToken. */
        public resumeToken: Uint8Array;

        /** Target readTime. */
        public readTime?: google.protobuf.ITimestamp | null;

        /** Target targetId. */
        public targetId: number;

        /** Target once. */
        public once: boolean;

        /** Target targetType. */
        public targetType?: 'query' | 'documents';

        /** Target resumeType. */
        public resumeType?: 'resumeToken' | 'readTime';
      }

      namespace Target {
        /** Properties of a DocumentsTarget. */
        interface IDocumentsTarget {
          /** DocumentsTarget documents */
          documents?: string[] | null;
        }

        /** Represents a DocumentsTarget. */
        class DocumentsTarget implements IDocumentsTarget {
          /**
           * Constructs a new DocumentsTarget.
           * @param [properties] Properties to set
           */
          constructor(properties?: google.firestore.v1.Target.IDocumentsTarget);

          /** DocumentsTarget documents. */
          public documents: string[];
        }

        /** Properties of a QueryTarget. */
        interface IQueryTarget {
          /** QueryTarget parent */
          parent?: string | null;

          /** QueryTarget structuredQuery */
          structuredQuery?: google.firestore.v1.IStructuredQuery | null;
        }

        /** Represents a QueryTarget. */
        class QueryTarget implements IQueryTarget {
          /**
           * Constructs a new QueryTarget.
           * @param [properties] Properties to set
           */
          constructor(properties?: google.firestore.v1.Target.IQueryTarget);

          /** QueryTarget parent. */
          public parent: string;

          /** QueryTarget structuredQuery. */
          public structuredQuery?: google.firestore.v1.IStructuredQuery | null;

          /** QueryTarget queryType. */
          public queryType?: 'structuredQuery';
        }
      }

      /** Properties of a TargetChange. */
      interface ITargetChange {
        /** TargetChange targetChangeType */
        targetChangeType?: google.firestore.v1.TargetChange.TargetChangeType | null;

        /** TargetChange targetIds */
        targetIds?: number[] | null;

        /** TargetChange cause */
        cause?: google.rpc.IStatus | null;

        /** TargetChange resumeToken */
        resumeToken?: Uint8Array | null;

        /** TargetChange readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a TargetChange. */
      class TargetChange implements ITargetChange {
        /**
         * Constructs a new TargetChange.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ITargetChange);

        /** TargetChange targetChangeType. */
        public targetChangeType: google.firestore.v1.TargetChange.TargetChangeType;

        /** TargetChange targetIds. */
        public targetIds: number[];

        /** TargetChange cause. */
        public cause?: google.rpc.IStatus | null;

        /** TargetChange resumeToken. */
        public resumeToken: Uint8Array;

        /** TargetChange readTime. */
        public readTime?: google.protobuf.ITimestamp | null;
      }

      namespace TargetChange {
        /** TargetChangeType enum. */
        type TargetChangeType =
          | 'NO_CHANGE'
          | 'ADD'
          | 'REMOVE'
          | 'CURRENT'
          | 'RESET';
      }

      /** Properties of a ListCollectionIdsRequest. */
      interface IListCollectionIdsRequest {
        /** ListCollectionIdsRequest parent */
        parent?: string | null;

        /** ListCollectionIdsRequest pageSize */
        pageSize?: number | null;

        /** ListCollectionIdsRequest pageToken */
        pageToken?: string | null;
      }

      /** Represents a ListCollectionIdsRequest. */
      class ListCollectionIdsRequest implements IListCollectionIdsRequest {
        /**
         * Constructs a new ListCollectionIdsRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IListCollectionIdsRequest);

        /** ListCollectionIdsRequest parent. */
        public parent: string;

        /** ListCollectionIdsRequest pageSize. */
        public pageSize: number;

        /** ListCollectionIdsRequest pageToken. */
        public pageToken: string;
      }

      /** Properties of a ListCollectionIdsResponse. */
      interface IListCollectionIdsResponse {
        /** ListCollectionIdsResponse collectionIds */
        collectionIds?: string[] | null;

        /** ListCollectionIdsResponse nextPageToken */
        nextPageToken?: string | null;
      }

      /** Represents a ListCollectionIdsResponse. */
      class ListCollectionIdsResponse implements IListCollectionIdsResponse {
        /**
         * Constructs a new ListCollectionIdsResponse.
         * @param [properties] Properties to set
         */
        constructor(
          properties?: google.firestore.v1.IListCollectionIdsResponse
        );

        /** ListCollectionIdsResponse collectionIds. */
        public collectionIds: string[];

        /** ListCollectionIdsResponse nextPageToken. */
        public nextPageToken: string;
      }

      /** Properties of a StructuredQuery. */
      interface IStructuredQuery {
        /** StructuredQuery select */
        select?: google.firestore.v1.StructuredQuery.IProjection | null;

        /** StructuredQuery from */
        from?: google.firestore.v1.StructuredQuery.ICollectionSelector[] | null;

        /** StructuredQuery where */
        where?: google.firestore.v1.StructuredQuery.IFilter | null;

        /** StructuredQuery orderBy */
        orderBy?: google.firestore.v1.StructuredQuery.IOrder[] | null;

        /** StructuredQuery startAt */
        startAt?: google.firestore.v1.ICursor | null;

        /** StructuredQuery endAt */
        endAt?: google.firestore.v1.ICursor | null;

        /** StructuredQuery offset */
        offset?: number | null;

        /** StructuredQuery limit */
        limit?: google.protobuf.IInt32Value | null;
      }

      /** Represents a StructuredQuery. */
      class StructuredQuery implements IStructuredQuery {
        /**
         * Constructs a new StructuredQuery.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IStructuredQuery);

        /** StructuredQuery select. */
        public select?: google.firestore.v1.StructuredQuery.IProjection | null;

        /** StructuredQuery from. */
        public from: google.firestore.v1.StructuredQuery.ICollectionSelector[];

        /** StructuredQuery where. */
        public where?: google.firestore.v1.StructuredQuery.IFilter | null;

        /** StructuredQuery orderBy. */
        public orderBy: google.firestore.v1.StructuredQuery.IOrder[];

        /** StructuredQuery startAt. */
        public startAt?: google.firestore.v1.ICursor | null;

        /** StructuredQuery endAt. */
        public endAt?: google.firestore.v1.ICursor | null;

        /** StructuredQuery offset. */
        public offset: number;

        /** StructuredQuery limit. */
        public limit?: google.protobuf.IInt32Value | null;
      }

      namespace StructuredQuery {
        /** Properties of a CollectionSelector. */
        interface ICollectionSelector {
          /** CollectionSelector collectionId */
          collectionId?: string | null;

          /** CollectionSelector allDescendants */
          allDescendants?: boolean | null;
        }

        /** Represents a CollectionSelector. */
        class CollectionSelector implements ICollectionSelector {
          /**
           * Constructs a new CollectionSelector.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.ICollectionSelector
          );

          /** CollectionSelector collectionId. */
          public collectionId: string;

          /** CollectionSelector allDescendants. */
          public allDescendants: boolean;
        }

        /** Properties of a Filter. */
        interface IFilter {
          /** Filter compositeFilter */
          compositeFilter?: google.firestore.v1.StructuredQuery.ICompositeFilter | null;

          /** Filter fieldFilter */
          fieldFilter?: google.firestore.v1.StructuredQuery.IFieldFilter | null;

          /** Filter unaryFilter */
          unaryFilter?: google.firestore.v1.StructuredQuery.IUnaryFilter | null;
        }

        /** Represents a Filter. */
        class Filter implements IFilter {
          /**
           * Constructs a new Filter.
           * @param [properties] Properties to set
           */
          constructor(properties?: google.firestore.v1.StructuredQuery.IFilter);

          /** Filter compositeFilter. */
          public compositeFilter?: google.firestore.v1.StructuredQuery.ICompositeFilter | null;

          /** Filter fieldFilter. */
          public fieldFilter?: google.firestore.v1.StructuredQuery.IFieldFilter | null;

          /** Filter unaryFilter. */
          public unaryFilter?: google.firestore.v1.StructuredQuery.IUnaryFilter | null;

          /** Filter filterType. */
          public filterType?: 'compositeFilter' | 'fieldFilter' | 'unaryFilter';
        }

        /** Properties of a CompositeFilter. */
        interface ICompositeFilter {
          /** CompositeFilter op */
          op?: google.firestore.v1.StructuredQuery.CompositeFilter.Operator | null;

          /** CompositeFilter filters */
          filters?: google.firestore.v1.StructuredQuery.IFilter[] | null;
        }

        /** Represents a CompositeFilter. */
        class CompositeFilter implements ICompositeFilter {
          /**
           * Constructs a new CompositeFilter.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.ICompositeFilter
          );

          /** CompositeFilter op. */
          public op: google.firestore.v1.StructuredQuery.CompositeFilter.Operator;

          /** CompositeFilter filters. */
          public filters: google.firestore.v1.StructuredQuery.IFilter[];
        }

        namespace CompositeFilter {
          /** Operator enum. */
          type Operator = 'OPERATOR_UNSPECIFIED' | 'AND';
        }

        /** Properties of a FieldFilter. */
        interface IFieldFilter {
          /** FieldFilter field */
          field?: google.firestore.v1.StructuredQuery.IFieldReference | null;

          /** FieldFilter op */
          op?: google.firestore.v1.StructuredQuery.FieldFilter.Operator | null;

          /** FieldFilter value */
          value?: google.firestore.v1.IValue | null;
        }

        /** Represents a FieldFilter. */
        class FieldFilter implements IFieldFilter {
          /**
           * Constructs a new FieldFilter.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.IFieldFilter
          );

          /** FieldFilter field. */
          public field?: google.firestore.v1.StructuredQuery.IFieldReference | null;

          /** FieldFilter op. */
          public op: google.firestore.v1.StructuredQuery.FieldFilter.Operator;

          /** FieldFilter value. */
          public value?: google.firestore.v1.IValue | null;
        }

        namespace FieldFilter {
          /** Operator enum. */
          type Operator =
            | 'OPERATOR_UNSPECIFIED'
            | 'LESS_THAN'
            | 'LESS_THAN_OR_EQUAL'
            | 'GREATER_THAN'
            | 'GREATER_THAN_OR_EQUAL'
            | 'EQUAL'
            | 'ARRAY_CONTAINS';
        }

        /** Properties of an UnaryFilter. */
        interface IUnaryFilter {
          /** UnaryFilter op */
          op?: google.firestore.v1.StructuredQuery.UnaryFilter.Operator | null;

          /** UnaryFilter field */
          field?: google.firestore.v1.StructuredQuery.IFieldReference | null;
        }

        /** Represents an UnaryFilter. */
        class UnaryFilter implements IUnaryFilter {
          /**
           * Constructs a new UnaryFilter.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.IUnaryFilter
          );

          /** UnaryFilter op. */
          public op: google.firestore.v1.StructuredQuery.UnaryFilter.Operator;

          /** UnaryFilter field. */
          public field?: google.firestore.v1.StructuredQuery.IFieldReference | null;

          /** UnaryFilter operandType. */
          public operandType?: 'field';
        }

        namespace UnaryFilter {
          /** Operator enum. */
          type Operator = 'OPERATOR_UNSPECIFIED' | 'IS_NAN' | 'IS_NULL';
        }

        /** Properties of a FieldReference. */
        interface IFieldReference {
          /** FieldReference fieldPath */
          fieldPath?: string | null;
        }

        /** Represents a FieldReference. */
        class FieldReference implements IFieldReference {
          /**
           * Constructs a new FieldReference.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.IFieldReference
          );

          /** FieldReference fieldPath. */
          public fieldPath: string;
        }

        /** Properties of an Order. */
        interface IOrder {
          /** Order field */
          field?: google.firestore.v1.StructuredQuery.IFieldReference | null;

          /** Order direction */
          direction?: google.firestore.v1.StructuredQuery.Direction | null;
        }

        /** Represents an Order. */
        class Order implements IOrder {
          /**
           * Constructs a new Order.
           * @param [properties] Properties to set
           */
          constructor(properties?: google.firestore.v1.StructuredQuery.IOrder);

          /** Order field. */
          public field?: google.firestore.v1.StructuredQuery.IFieldReference | null;

          /** Order direction. */
          public direction: google.firestore.v1.StructuredQuery.Direction;
        }

        /** Properties of a Projection. */
        interface IProjection {
          /** Projection fields */
          fields?: google.firestore.v1.StructuredQuery.IFieldReference[] | null;
        }

        /** Represents a Projection. */
        class Projection implements IProjection {
          /**
           * Constructs a new Projection.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.StructuredQuery.IProjection
          );

          /** Projection fields. */
          public fields: google.firestore.v1.StructuredQuery.IFieldReference[];
        }

        /** Direction enum. */
        type Direction = 'DIRECTION_UNSPECIFIED' | 'ASCENDING' | 'DESCENDING';
      }

      /** Properties of a Cursor. */
      interface ICursor {
        /** Cursor values */
        values?: google.firestore.v1.IValue[] | null;

        /** Cursor before */
        before?: boolean | null;
      }

      /** Represents a Cursor. */
      class Cursor implements ICursor {
        /**
         * Constructs a new Cursor.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.ICursor);

        /** Cursor values. */
        public values: google.firestore.v1.IValue[];

        /** Cursor before. */
        public before: boolean;
      }

      /** Properties of a Write. */
      interface IWrite {
        /** Write update */
        update?: google.firestore.v1.IDocument | null;

        /** Write delete */
        delete?: string | null;

        /** Write transform */
        transform?: google.firestore.v1.IDocumentTransform | null;

        /** Write updateMask */
        updateMask?: google.firestore.v1.IDocumentMask | null;

        /** Write currentDocument */
        currentDocument?: google.firestore.v1.IPrecondition | null;
      }

      /** Represents a Write. */
      class Write implements IWrite {
        /**
         * Constructs a new Write.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IWrite);

        /** Write update. */
        public update?: google.firestore.v1.IDocument | null;

        /** Write delete. */
        public delete: string;

        /** Write transform. */
        public transform?: google.firestore.v1.IDocumentTransform | null;

        /** Write updateMask. */
        public updateMask?: google.firestore.v1.IDocumentMask | null;

        /** Write currentDocument. */
        public currentDocument?: google.firestore.v1.IPrecondition | null;

        /** Write operation. */
        public operation?: 'update' | 'delete' | 'transform';
      }

      /** Properties of a DocumentTransform. */
      interface IDocumentTransform {
        /** DocumentTransform document */
        document?: string | null;

        /** DocumentTransform fieldTransforms */
        fieldTransforms?:
          | google.firestore.v1.DocumentTransform.IFieldTransform[]
          | null;
      }

      /** Represents a DocumentTransform. */
      class DocumentTransform implements IDocumentTransform {
        /**
         * Constructs a new DocumentTransform.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocumentTransform);

        /** DocumentTransform document. */
        public document: string;

        /** DocumentTransform fieldTransforms. */
        public fieldTransforms: google.firestore.v1.DocumentTransform.IFieldTransform[];
      }

      namespace DocumentTransform {
        /** Properties of a FieldTransform. */
        interface IFieldTransform {
          /** FieldTransform fieldPath */
          fieldPath?: string | null;

          /** FieldTransform setToServerValue */
          setToServerValue?: google.firestore.v1.DocumentTransform.FieldTransform.ServerValue | null;

          /** FieldTransform increment */
          increment?: google.firestore.v1.IValue | null;

          /** FieldTransform maximum */
          maximum?: google.firestore.v1.IValue | null;

          /** FieldTransform minimum */
          minimum?: google.firestore.v1.IValue | null;

          /** FieldTransform appendMissingElements */
          appendMissingElements?: google.firestore.v1.IArrayValue | null;

          /** FieldTransform removeAllFromArray */
          removeAllFromArray?: google.firestore.v1.IArrayValue | null;
        }

        /** Represents a FieldTransform. */
        class FieldTransform implements IFieldTransform {
          /**
           * Constructs a new FieldTransform.
           * @param [properties] Properties to set
           */
          constructor(
            properties?: google.firestore.v1.DocumentTransform.IFieldTransform
          );

          /** FieldTransform fieldPath. */
          public fieldPath: string;

          /** FieldTransform setToServerValue. */
          public setToServerValue: google.firestore.v1.DocumentTransform.FieldTransform.ServerValue;

          /** FieldTransform increment. */
          public increment?: google.firestore.v1.IValue | null;

          /** FieldTransform maximum. */
          public maximum?: google.firestore.v1.IValue | null;

          /** FieldTransform minimum. */
          public minimum?: google.firestore.v1.IValue | null;

          /** FieldTransform appendMissingElements. */
          public appendMissingElements?: google.firestore.v1.IArrayValue | null;

          /** FieldTransform removeAllFromArray. */
          public removeAllFromArray?: google.firestore.v1.IArrayValue | null;

          /** FieldTransform transformType. */
          public transformType?:
            | 'setToServerValue'
            | 'increment'
            | 'maximum'
            | 'minimum'
            | 'appendMissingElements'
            | 'removeAllFromArray';
        }

        namespace FieldTransform {
          /** ServerValue enum. */
          type ServerValue = 'SERVER_VALUE_UNSPECIFIED' | 'REQUEST_TIME';
        }
      }

      /** Properties of a WriteResult. */
      interface IWriteResult {
        /** WriteResult updateTime */
        updateTime?: google.protobuf.ITimestamp | null;

        /** WriteResult transformResults */
        transformResults?: google.firestore.v1.IValue[] | null;
      }

      /** Represents a WriteResult. */
      class WriteResult implements IWriteResult {
        /**
         * Constructs a new WriteResult.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IWriteResult);

        /** WriteResult updateTime. */
        public updateTime?: google.protobuf.ITimestamp | null;

        /** WriteResult transformResults. */
        public transformResults: google.firestore.v1.IValue[];
      }

      /** Properties of a DocumentChange. */
      interface IDocumentChange {
        /** DocumentChange document */
        document?: google.firestore.v1.IDocument | null;

        /** DocumentChange targetIds */
        targetIds?: number[] | null;

        /** DocumentChange removedTargetIds */
        removedTargetIds?: number[] | null;
      }

      /** Represents a DocumentChange. */
      class DocumentChange implements IDocumentChange {
        /**
         * Constructs a new DocumentChange.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocumentChange);

        /** DocumentChange document. */
        public document?: google.firestore.v1.IDocument | null;

        /** DocumentChange targetIds. */
        public targetIds: number[];

        /** DocumentChange removedTargetIds. */
        public removedTargetIds: number[];
      }

      /** Properties of a DocumentDelete. */
      interface IDocumentDelete {
        /** DocumentDelete document */
        document?: string | null;

        /** DocumentDelete removedTargetIds */
        removedTargetIds?: number[] | null;

        /** DocumentDelete readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a DocumentDelete. */
      class DocumentDelete implements IDocumentDelete {
        /**
         * Constructs a new DocumentDelete.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocumentDelete);

        /** DocumentDelete document. */
        public document: string;

        /** DocumentDelete removedTargetIds. */
        public removedTargetIds: number[];

        /** DocumentDelete readTime. */
        public readTime?: google.protobuf.ITimestamp | null;
      }

      /** Properties of a DocumentRemove. */
      interface IDocumentRemove {
        /** DocumentRemove document */
        document?: string | null;

        /** DocumentRemove removedTargetIds */
        removedTargetIds?: number[] | null;

        /** DocumentRemove readTime */
        readTime?: google.protobuf.ITimestamp | null;
      }

      /** Represents a DocumentRemove. */
      class DocumentRemove implements IDocumentRemove {
        /**
         * Constructs a new DocumentRemove.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IDocumentRemove);

        /** DocumentRemove document. */
        public document: string;

        /** DocumentRemove removedTargetIds. */
        public removedTargetIds: number[];

        /** DocumentRemove readTime. */
        public readTime?: google.protobuf.ITimestamp | null;
      }

      /** Properties of an ExistenceFilter. */
      interface IExistenceFilter {
        /** ExistenceFilter targetId */
        targetId?: number | null;

        /** ExistenceFilter count */
        count?: number | null;
      }

      /** Represents an ExistenceFilter. */
      class ExistenceFilter implements IExistenceFilter {
        /**
         * Constructs a new ExistenceFilter.
         * @param [properties] Properties to set
         */
        constructor(properties?: google.firestore.v1.IExistenceFilter);

        /** ExistenceFilter targetId. */
        public targetId: number;

        /** ExistenceFilter count. */
        public count: number;
      }
    }
  }

  /** Namespace api. */
  namespace api {
    /** Properties of a Http. */
    interface IHttp {
      /** Http rules */
      rules?: google.api.IHttpRule[] | null;
    }

    /** Represents a Http. */
    class Http implements IHttp {
      /**
       * Constructs a new Http.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.api.IHttp);

      /** Http rules. */
      public rules: google.api.IHttpRule[];
    }

    /** Properties of a HttpRule. */
    interface IHttpRule {
      /** HttpRule get */
      get?: string | null;

      /** HttpRule put */
      put?: string | null;

      /** HttpRule post */
      post?: string | null;

      /** HttpRule delete */
      delete?: string | null;

      /** HttpRule patch */
      patch?: string | null;

      /** HttpRule custom */
      custom?: google.api.ICustomHttpPattern | null;

      /** HttpRule selector */
      selector?: string | null;

      /** HttpRule body */
      body?: string | null;

      /** HttpRule additionalBindings */
      additionalBindings?: google.api.IHttpRule[] | null;
    }

    /** Represents a HttpRule. */
    class HttpRule implements IHttpRule {
      /**
       * Constructs a new HttpRule.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.api.IHttpRule);

      /** HttpRule get. */
      public get: string;

      /** HttpRule put. */
      public put: string;

      /** HttpRule post. */
      public post: string;

      /** HttpRule delete. */
      public delete: string;

      /** HttpRule patch. */
      public patch: string;

      /** HttpRule custom. */
      public custom?: google.api.ICustomHttpPattern | null;

      /** HttpRule selector. */
      public selector: string;

      /** HttpRule body. */
      public body: string;

      /** HttpRule additionalBindings. */
      public additionalBindings: google.api.IHttpRule[];

      /** HttpRule pattern. */
      public pattern?: 'get' | 'put' | 'post' | 'delete' | 'patch' | 'custom';
    }

    /** Properties of a CustomHttpPattern. */
    interface ICustomHttpPattern {
      /** CustomHttpPattern kind */
      kind?: string | null;

      /** CustomHttpPattern path */
      path?: string | null;
    }

    /** Represents a CustomHttpPattern. */
    class CustomHttpPattern implements ICustomHttpPattern {
      /**
       * Constructs a new CustomHttpPattern.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.api.ICustomHttpPattern);

      /** CustomHttpPattern kind. */
      public kind: string;

      /** CustomHttpPattern path. */
      public path: string;
    }
  }

  /** Namespace type. */
  namespace type {
    /** Properties of a LatLng. */
    interface ILatLng {
      /** LatLng latitude */
      latitude?: number | null;

      /** LatLng longitude */
      longitude?: number | null;
    }

    /** Represents a LatLng. */
    class LatLng implements ILatLng {
      /**
       * Constructs a new LatLng.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.type.ILatLng);

      /** LatLng latitude. */
      public latitude: number;

      /** LatLng longitude. */
      public longitude: number;
    }
  }

  /** Namespace rpc. */
  namespace rpc {
    /** Properties of a Status. */
    interface IStatus {
      /** Status code */
      code?: number | null;

      /** Status message */
      message?: string | null;

      /** Status details */
      details?: google.protobuf.IAny[] | null;
    }

    /** Represents a Status. */
    class Status implements IStatus {
      /**
       * Constructs a new Status.
       * @param [properties] Properties to set
       */
      constructor(properties?: google.rpc.IStatus);

      /** Status code. */
      public code: number;

      /** Status message. */
      public message: string;

      /** Status details. */
      public details: google.protobuf.IAny[];
    }
  }
}
