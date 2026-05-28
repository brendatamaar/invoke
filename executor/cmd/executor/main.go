package main

import (
	"net"
	"os"
	"os/signal"
	"syscall"

	invoke "github.com/brendatamaar/invoke/executor/internal/executor"
	"github.com/brendatamaar/invoke/executor/internal/executorpb"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	addr := env("EXECUTOR_ADDR", ":50051")
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to listen")
	}

	server := grpc.NewServer()
	executorpb.RegisterHttpExecutorServer(server, invoke.NewService())

	go func() {
		log.Info().Str("addr", addr).Msg("executor listening")
		if err := server.Serve(listener); err != nil {
			log.Fatal().Err(err).Msg("executor stopped")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Info().Msg("shutting down executor")
	server.GracefulStop()
}

func env(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
