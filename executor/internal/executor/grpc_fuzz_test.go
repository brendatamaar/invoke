package executor

import (
	"testing"

	"google.golang.org/protobuf/proto"
	descriptorpb "google.golang.org/protobuf/types/descriptorpb"
)

// TestBuildFileRegistryCyclicDeps verifies that cyclic dependencies don't cause
// infinite loops or OOM in the descriptor registry builder.
func TestBuildFileRegistryCyclicDeps(t *testing.T) {
	// Create two files that depend on each other (cycle).
	fileA := &descriptorpb.FileDescriptorProto{
		Name:       proto.String("a.proto"),
		Syntax:     proto.String("proto3"),
		Dependency: []string{"b.proto"},
	}
	fileB := &descriptorpb.FileDescriptorProto{
		Name:       proto.String("b.proto"),
		Syntax:     proto.String("proto3"),
		Dependency: []string{"a.proto"},
	}

	filesByName := map[string]*descriptorpb.FileDescriptorProto{
		"a.proto": fileA,
		"b.proto": fileB,
	}

	// Should not hang or panic — may return an error, which is fine.
	_, _ = buildFileRegistry(filesByName)
}

// TestBuildFileRegistryMissingDeps verifies that missing dependencies don't crash.
func TestBuildFileRegistryMissingDeps(t *testing.T) {
	file := &descriptorpb.FileDescriptorProto{
		Name:       proto.String("service.proto"),
		Syntax:     proto.String("proto3"),
		Dependency: []string{"nonexistent.proto", "also_missing.proto"},
	}

	filesByName := map[string]*descriptorpb.FileDescriptorProto{
		"service.proto": file,
	}

	// Should not panic. May return an error for missing deps.
	_, _ = buildFileRegistry(filesByName)
}

// TestBuildFileRegistryNilEntries verifies nil entries (from cycle-breaking markers) are handled.
func TestBuildFileRegistryNilEntries(t *testing.T) {
	file := &descriptorpb.FileDescriptorProto{
		Name:       proto.String("real.proto"),
		Syntax:     proto.String("proto3"),
		Dependency: []string{"phantom.proto"},
	}

	filesByName := map[string]*descriptorpb.FileDescriptorProto{
		"real.proto":    file,
		"phantom.proto": nil, // Marker from fetchMissingDeps cycle-breaking
	}

	// Should not panic on nil entries.
	_, _ = buildFileRegistry(filesByName)
}

// TestBuildFileRegistryDeepChain verifies deeply nested dependency chains don't OOM.
func TestBuildFileRegistryDeepChain(t *testing.T) {
	const depth = 500
	filesByName := make(map[string]*descriptorpb.FileDescriptorProto, depth)

	for i := 0; i < depth; i++ {
		name := depName(i)
		var deps []string
		if i > 0 {
			deps = []string{depName(i - 1)}
		}
		filesByName[name] = &descriptorpb.FileDescriptorProto{
			Name:       proto.String(name),
			Syntax:     proto.String("proto3"),
			Dependency: deps,
		}
	}

	_, _ = buildFileRegistry(filesByName)
}

// FuzzBuildFileRegistry exercises buildFileRegistry with random descriptor sets.
func FuzzBuildFileRegistry(f *testing.F) {
	// Seed corpus: a simple valid descriptor set.
	seed := &descriptorpb.FileDescriptorProto{
		Name:   proto.String("seed.proto"),
		Syntax: proto.String("proto3"),
	}
	seedBytes, _ := proto.Marshal(seed)
	f.Add(seedBytes, 1)

	f.Fuzz(func(t *testing.T, data []byte, numFiles int) {
		if numFiles < 1 || numFiles > 50 {
			return
		}

		filesByName := make(map[string]*descriptorpb.FileDescriptorProto)

		// Try to unmarshal the fuzz data as a FileDescriptorProto.
		file := new(descriptorpb.FileDescriptorProto)
		if err := proto.Unmarshal(data, file); err != nil {
			return
		}
		if file.GetName() == "" {
			file.Name = proto.String("fuzz.proto")
		}
		filesByName[file.GetName()] = file

		// Add some synthetic deps that reference each other.
		for i := 1; i < numFiles; i++ {
			depFile := &descriptorpb.FileDescriptorProto{
				Name:       proto.String(depName(i)),
				Syntax:     proto.String("proto3"),
				Dependency: []string{file.GetName()},
			}
			filesByName[depFile.GetName()] = depFile
		}

		// Must not panic or hang.
		_, _ = buildFileRegistry(filesByName)
	})
}

func depName(i int) string {
	return "dep_" + string(rune('a'+i%26)) + string(rune('0'+i/26)) + ".proto"
}
