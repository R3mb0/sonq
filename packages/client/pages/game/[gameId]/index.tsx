import { NextPage } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import useOn from "../../../hooks/use-on";
import socketio from "socket.io-client";
import JoinGameModal from "../../../components/join-game-modal";
import { Domain, SocketClient, SocketServer } from "@sonq/api";
import useGame, { GameNotFoundError } from "../../../hooks/use-game";
import Lobby from "../../../components/game-phases/lobby";
import PlaySong from "../../../components/game-phases/play-song";
import Review from "../../../components/game-phases/review";
import Summary from "../../../components/game-phases/summary";
import { ADMINKEY } from "../../../constants/local-storage";
import getConfig from "next/config";
import VolumeControl from "../../../components/volume-control";
import { useRouter } from "next/router";
import LoadingSpinner from "../../../components/loading-spinner";
import GameSideBar from "../../../components/game-side-bar";
import GuessBubbles from "../../../components/guess-bubbles";

const config = getConfig();

interface GamePageProps {
  gameId: string;
}

const GamePage: NextPage<GamePageProps> = ({ gameId }) => {
  const [volume, setVolume] = useState(5);
  const [joinedGame, setJoinedGame] = useState(false);
  const router = useRouter();
  const gameQuery = useGame(gameId, {
    retry(_errorCount, error) {
      return !(error instanceof GameNotFoundError);
    },
    onError(error) {
      if (error instanceof GameNotFoundError) {
        console.warn(error.message);
        router.replace(`/?error=game-not-found`);
      }
    },
  });
  const [gamePhase, setGamePhase] = useState<Domain.GamePhase>({
    type: Domain.GamePhaseType.Lobby,
    data: undefined,
  });
  const [players, setPlayers] = useState<Domain.Player[]>([]);

  useEffect(() => {
    if (gameQuery.data) {
      setPlayers(gameQuery.data.players);
      setGamePhase(gameQuery.data.phase);
    }
  }, [gameQuery.data?.phase?.type]);

  const io = useMemo(() => {
    if (typeof window === "undefined") {
      return;
    }

    return socketio(config.publicRuntimeConfig.serverUrl, {
      query: {
        game: gameId,
        adminKey: localStorage.getItem(ADMINKEY(gameId)),
      },
    });
  }, [gameId]);

  useOn(
    io,
    SocketServer.Events.PhaseChange,
    (event: SocketServer.PhaseChangeEvent) => {
      setGamePhase(event.phase);
    }
  );

  /**
   * When either a player leaves or joines, similar events are dispatched
   */
  const playerlistChanged = (
    event: SocketServer.PlayerJoinedEvent | SocketServer.PlayerLeftEvent
  ) => {
    setPlayers(event.players);
  };
  useOn(io, SocketServer.Events.PlayerJoined, playerlistChanged);
  useOn(io, SocketServer.Events.PlayerLeft, playerlistChanged);

  const joinGame = useCallback(
    (username: string) => {
      const joinEvent: SocketClient.JoinEvent = {
        username,
      };
      io.emit(SocketClient.Events.Join, joinEvent);
      setJoinedGame(true);
    },
    [io]
  );

  return (
    <div className="bg-gray-900">
      {gameQuery.isLoading ? (
        <div className="p-20 flex justify-center text-white">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex min-h-screen">
          <GameSideBar
            players={players}
            setVolume={setVolume}
            io={io}
            phase={gamePhase.type}
          />
          <div className="flex-grow relative">
            <GuessBubbles io={io} />
            <JoinGameModal open={!joinedGame} onJoin={joinGame} />
            {/* {gamePhase.type !== Domain.GamePhaseType.Lobby &&
              <Players players={players} io={io} phase={gamePhase.type} />
            } */}
            <div className="max-w-screen-lg mx-auto relative z-10">
              {gamePhase.type === Domain.GamePhaseType.Lobby && (
                <Lobby io={io} gameId={gameId} players={players} />
              )}
              {gamePhase.type === Domain.GamePhaseType.PlaySong && (
                <PlaySong
                  volume={volume}
                  io={io}
                  phaseData={gamePhase.data}
                  gameId={gameId}
                />
              )}
              {gamePhase.type === Domain.GamePhaseType.Review && (
                <Review io={io} phaseData={gamePhase.data} gameId={gameId} />
              )}
              {gamePhase.type === Domain.GamePhaseType.Summary && (
                <Summary io={io} gameId={gameId} phaseData={gamePhase.data} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

GamePage.getInitialProps = (context) => {
  return {
    gameId: context.query.gameId as string,
  };
};

export default GamePage;
