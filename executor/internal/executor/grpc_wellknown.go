package executor

import (
	"context"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
)

// registryForService resolves a proto file registry for the given service, using
// protoset → server reflection → well-known fallback in that priority order.
func registryForService(ctx context.Context, conn *grpc.ClientConn, protosetBase64, serviceName string) (*protoregistry.Files, error) {
	if ps := strings.TrimSpace(protosetBase64); ps != "" {
		if reg, err := registryFromProtosetBase64(ps); err == nil {
			if _, lookupErr := reg.FindDescriptorByName(protoreflect.FullName(serviceName)); lookupErr == nil {
				return reg, nil
			}
		}
	}
	files, err := descriptorRegistryForSymbols(ctx, conn, []string{serviceName})
	if err == nil {
		if _, lookupErr := files.FindDescriptorByName(protoreflect.FullName(serviceName)); lookupErr == nil {
			return files, nil
		}
	}
	if wk := wellKnownRegistryForService(serviceName); wk != nil {
		return wk, nil
	}
	if err != nil {
		return nil, err
	}
	return files, nil
}

var healthRegistry = func() *protoregistry.Files {
	return buildHealthProtoRegistry()
}()

// wellKnownRegistryForService returns a pre-built registry for services whose
// proto descriptors are embedded here to avoid requiring server reflection.
func wellKnownRegistryForService(serviceName string) *protoregistry.Files {
	if serviceName == "grpc.health.v1.Health" {
		return healthRegistry
	}
	return nil
}

func buildHealthProtoRegistry() *protoregistry.Files {
	statusField := &descriptorpb.FieldDescriptorProto{
		Name:     proto.String("status"),
		Number:   proto.Int32(1),
		Label:    descriptorpb.FieldDescriptorProto_LABEL_OPTIONAL.Enum(),
		Type:     descriptorpb.FieldDescriptorProto_TYPE_ENUM.Enum(),
		TypeName: proto.String(".grpc.health.v1.HealthCheckResponse.ServingStatus"),
		JsonName: proto.String("status"),
	}
	f := &descriptorpb.FileDescriptorProto{
		Name:    proto.String("grpc/health/v1/health.proto"),
		Package: proto.String("grpc.health.v1"),
		Syntax:  proto.String("proto3"),
		MessageType: []*descriptorpb.DescriptorProto{
			{
				Name: proto.String("HealthCheckRequest"),
				Field: []*descriptorpb.FieldDescriptorProto{
					{
						Name:     proto.String("service"),
						Number:   proto.Int32(1),
						Label:    descriptorpb.FieldDescriptorProto_LABEL_OPTIONAL.Enum(),
						Type:     descriptorpb.FieldDescriptorProto_TYPE_STRING.Enum(),
						JsonName: proto.String("service"),
					},
				},
			},
			{
				Name:  proto.String("HealthCheckResponse"),
				Field: []*descriptorpb.FieldDescriptorProto{statusField},
				EnumType: []*descriptorpb.EnumDescriptorProto{
					{
						Name: proto.String("ServingStatus"),
						Value: []*descriptorpb.EnumValueDescriptorProto{
							{Name: proto.String("UNKNOWN"), Number: proto.Int32(0)},
							{Name: proto.String("SERVING"), Number: proto.Int32(1)},
							{Name: proto.String("NOT_SERVING"), Number: proto.Int32(2)},
							{Name: proto.String("SERVICE_UNKNOWN"), Number: proto.Int32(3)},
						},
					},
				},
			},
		},
		Service: []*descriptorpb.ServiceDescriptorProto{
			{
				Name: proto.String("Health"),
				Method: []*descriptorpb.MethodDescriptorProto{
					{
						Name:       proto.String("Check"),
						InputType:  proto.String(".grpc.health.v1.HealthCheckRequest"),
						OutputType: proto.String(".grpc.health.v1.HealthCheckResponse"),
					},
					{
						Name:            proto.String("Watch"),
						InputType:       proto.String(".grpc.health.v1.HealthCheckRequest"),
						OutputType:      proto.String(".grpc.health.v1.HealthCheckResponse"),
						ServerStreaming: proto.Bool(true),
					},
				},
			},
		},
	}
	files, _ := buildFileRegistry(map[string]*descriptorpb.FileDescriptorProto{
		f.GetName(): f,
	})
	return files
}
