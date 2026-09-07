import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Flag, Handshake } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { getInitials } from '@/components/ui/Avatar';
import { seatColor } from '@/lib/arcade/playerColors';
import { cn } from '@/lib/utils';
import { ChessBoard } from './ChessBoard';
import { ChessClock } from './ChessClock';
import { useChessSocket } from './useChessSocket';
import type { GameRoomDetail, GameRoomMember, GameRoomMemberType, ChessMatchEndPayload, ChessColor } from '@/lib/types';

interface ChessStageProps {
  room: GameRoomDetail;
  onMatchEnd: (payload: ChessMatchEndPayload) => void;
}

const OUTCOME_REASON_LABEL: Record<string, string> = {
  checkmate: 'Checkmate',
  resignation: 'Resignation',
  timeout: 'Time forfeit',
  timeout_insufficient_material: 'Time out — insufficient material, drawn',
  stalemate: 'Stalemate',
  threefold_repetition: 'Draw by threefold repetition',
  insufficient_material: 'Draw by insufficient material',
  fifty_move_rule: 'Draw by the fifty-move rule',
  agreement: 'Draw agreed',
  disconnect_forfeit: 'Opponent disconnected',
};

export function ChessStage({ room, onMatchEnd }: ChessStageProps) {
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const myMemberType: GameRoomMemberType = role === 'employee' ? 'employee' : 'owner';
  const mySeatIndex =
    room.members.find((m) => m.memberType === myMemberType && m.memberId === authUser?.id)?.seatIndex ?? null;

  const { state, lastMove, rejection, roundEnd, opponentDisconnected, move, resign, offerDraw, respondDraw } = useChessSocket({
    roomId: room.id,
    onMatchEnd,
  });
  const [confirmResign, setConfirmResign] = useState(false);

  if (!state) {
    return <p className="py-20 text-center text-ink-400">Setting up the board…</p>;
  }

  const seatsByIndex = new Map(room.members.filter((m) => m.seatIndex !== null).map((m) => [m.seatIndex as number, m]));
  const myColor: ChessColor | null = mySeatIndex === state.whiteSeat ? 'w' : mySeatIndex === state.blackSeat ? 'b' : null;
  const isPlayer = myColor !== null;
  const isMyTurn = isPlayer && state.turn === myColor;
  const interactive = isMyTurn && !roundEnd;

  const whiteMember = seatsByIndex.get(state.whiteSeat);
  const blackMember = seatsByIndex.get(state.blackSeat);
  const opponentSeatIndex = mySeatIndex === state.whiteSeat ? state.blackSeat : state.whiteSeat;
  const drawOfferedToMe = isPlayer && state.drawOfferBy !== null && state.drawOfferBy !== mySeatIndex;
  const drawOfferedByMe = state.drawOfferBy !== null && state.drawOfferBy === mySeatIndex;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-4">
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
        {room.roundsTotal > 1 && (
          <span>
            Game {state.roundNumber} of {room.roundsTotal}
          </span>
        )}
        {isPlayer && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-bone-100 px-2.5 py-1 normal-case tracking-normal text-ink-700">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border border-ink-400"
              style={{ backgroundColor: myColor === 'w' ? '#FAF8F3' : '#161510' }}
            />
            Playing {myColor === 'w' ? 'White' : 'Black'}
          </span>
        )}
      </div>

      <PlayerBar
        member={blackMember}
        color="b"
        active={state.turn === 'b' && !roundEnd}
        clock={
          <ChessClock
            label={blackMember?.displayName ?? 'Black'}
            isBot={blackMember?.isBot}
            remainingMs={state.clocks.b}
            running={state.turn === 'b' && !roundEnd}
          />
        }
      />

      <ChessBoard
        fen={state.fen}
        myColor={myColor}
        lastMove={lastMove}
        inCheck={state.inCheck}
        interactive={interactive}
        onMove={move}
      />

      <PlayerBar
        member={whiteMember}
        color="w"
        active={state.turn === 'w' && !roundEnd}
        clock={
          <ChessClock
            label={whiteMember?.displayName ?? 'White'}
            isBot={whiteMember?.isBot}
            remainingMs={state.clocks.w}
            running={state.turn === 'w' && !roundEnd}
          />
        }
      />

      {rejection && isPlayer && (
        <p className="text-xs text-terracotta-600">
          {rejection.reason === 'illegal' && "That move isn't legal."}
          {rejection.reason === 'not_your_turn' && "It's not your turn yet."}
          {rejection.reason === 'invalid_input' && 'Something went wrong with that move.'}
        </p>
      )}

      {opponentDisconnected && opponentDisconnected.seat === opponentSeatIndex && (
        <p className="rounded-md border border-ochre-300 bg-ochre-50 px-3 py-2 text-xs text-ochre-700">
          Opponent disconnected — they have {Math.ceil(opponentDisconnected.graceMs / 1000)}s to reconnect before forfeiting.
        </p>
      )}

      {roundEnd && (
        <div className="rounded-md border border-brass-300 bg-brass-50 px-4 py-3 text-center text-sm font-medium text-brass-800">
          {OUTCOME_REASON_LABEL[roundEnd.reason] ?? roundEnd.reason}
          {roundEnd.roundNumber < room.roundsTotal && ' — next game starting…'}
        </div>
      )}

      {isPlayer && !roundEnd && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {drawOfferedToMe ? (
            <>
              <span className="text-xs text-ink-500">Opponent offers a draw</span>
              <Button variant="secondary" size="sm" onClick={() => respondDraw(true)}>
                Accept
              </Button>
              <Button variant="ghost" size="sm" onClick={() => respondDraw(false)}>
                Decline
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={offerDraw} disabled={drawOfferedByMe}>
              <Handshake size={14} />
              {drawOfferedByMe ? 'Draw offered' : 'Offer draw'}
            </Button>
          )}
          {confirmResign ? (
            <>
              <span className="text-xs text-ink-500">Resign this game?</span>
              <Button variant="destructive" size="sm" onClick={resign}>
                Yes, resign
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmResign(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmResign(true)}>
              <Flag size={14} />
              Resign
            </Button>
          )}
        </div>
      )}

      <MoveHistory moves={state.moveHistory} />
    </div>
  );
}

function PlayerBar({
  member,
  color,
  active,
  clock,
}: {
  member?: GameRoomMember;
  color: ChessColor;
  active: boolean;
  clock: ReactNode;
}) {
  const colors = seatColor(member?.seatIndex);
  return (
    <div className="flex w-full max-w-[560px] items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-medium text-bone-50',
            colors.bg,
          )}
        >
          {member?.isBot ? <Bot size={14} /> : getInitials(member?.displayName ?? '?')}
        </div>
        <span className="text-sm font-medium text-ink-800">{member?.displayName ?? (color === 'w' ? 'White' : 'Black')}</span>
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full border border-ink-400"
          style={{ backgroundColor: color === 'w' ? '#FAF8F3' : '#161510' }}
        />
      </div>
      <div className={cn('transition-transform duration-hover ease-brand', active && 'scale-[1.03]')}>{clock}</div>
    </div>
  );
}

function MoveHistory({ moves }: { moves: string[] }) {
  if (moves.length === 0) return null;
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]]);

  return (
    <div className="max-h-32 w-full max-w-[560px] overflow-y-auto rounded-md border border-ink-200 bg-bone-100 p-2">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-xs">
        {pairs.map(([w, b], i) => (
          <div key={i} className="contents">
            <span className="text-ink-400">{i + 1}.</span>
            <span className="font-mono text-ink-800">{w}</span>
            <span className="font-mono text-ink-800">{b ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
