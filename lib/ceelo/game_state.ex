defmodule Ceelo.GameState do
  use Agent
  alias Ceelo.GameState
  alias Ceelo.Gameplay
  require Logger

  @doc false
  def start_link(_) do
    Agent.start_link(&init/0, name: __MODULE__)
  end

  def init() do
    %{
      player_queue: nil,
      game: nil,
      message_timestamp: nil,
      current_player: nil
    }
  end

  def current_player(), do: Agent.get(GameState, & &1.current_player)

  def message_timestamp(), do: Agent.get(GameState, & &1.message_timestamp)

  def created?(), do: Agent.get(GameState, &(&1.game != nil or &1.player_queue != nil))

  def game_over?(),
    do:
      Agent.get(GameState, fn
        %{game: nil} ->
          false

        %{game: game} ->
          Enum.any?(game, fn turn -> turn.score == :four_five_six end) or
            Enum.all?(game, fn turn -> not is_nil(turn.score) end)
      end)

  def get_winners() do
    Agent.get(GameState, fn
      %{game: nil} ->
        nil

      %{game: game} ->
        game
        |> Enum.sort_by(&Gameplay.roll_to_int(&1.score))
        |> Enum.reverse()
        |> Enum.chunk_by(& &1)
        |> List.first()
    end)
  end

  def register_score(score) do
    Agent.update(GameState, fn %{current_player: current_player} = state ->
      game =
        state.game
        |> Enum.map(fn
          turn = %{player_id: ^current_player} -> %{turn | score: score}
          turn -> turn
        end)

      current_player =
        game
        |> Enum.find(&(not is_nil(&1.score) and &1.player_id !== current_player))
        |> case do
          nil -> nil
          %{player_id: player_id} -> player_id
        end

      %{state | game: game, current_player: current_player}
    end)
  end

  # Public API
  # Create a new game, get a new player queue to be instantiated into a new game
  # once the game has begun
  def create_game(timestamp, user_id) do
    Agent.update(GameState, fn state ->
      %{
        state
        | player_queue: MapSet.new([user_id]),
          current_player: user_id,
          message_timestamp: timestamp,
          game: nil
      }
    end)
  end

  # Begin a game
  def begin_game() do
    Agent.update(GameState, fn state ->
      %{state | player_queue: nil, game: game_from_queue(state.player_queue)}
    end)
  end

  # Roll the dice, begins game if not yet started.
  def roll() do
    if Agent.get(GameState, & &1.game) == nil do
      Logger.info("Beginning the game")
      begin_game()
    end

    {score, rolls} = Gameplay.get_rolls()

    Logger.info("score: #{Gameplay.roll_to_str(score)}")
    :ok = register_score(score)

    roll_text =
      case rolls do
        [m, m, m, m, m] -> "ROLL OUT!!!!"
        rolls -> rolls |> Enum.map(&Gameplay.roll_to_str/1) |> Enum.join("\n")
      end

    if game_over?() do
      roll_text <> end_game()
    else
      roll_text <> "\nUP NEXT IS <@#{current_player()}>"
    end
  end

  def end_game() do
    get_winners()
    |> case do
      [winner] ->
        Logger.info("game over")
        Logger.info("Winner:")
        Logger.info(winner.player_id)

        Agent.update(GameState, fn state ->
          %{state | current_player: nil, game: nil, message_timestamp: nil, player_queue: nil}
        end)

        "\nGAME IS OVER: <@#{winner.player_id}> is the winner! with #{
          Gameplay.roll_to_str(winner.score)
        }"

      winners ->
        Logger.info("push")

        Agent.update(GameState, fn state ->
          %{
            state
            | current_player: winners[0].player_id,
              # reset the score to nil with the winners as the players of the
              # new game
              game:
                winners
                |> Enum.map(&Map.put(&1, :score, nil)),
              message_timestamp: nil,
              player_queue: nil
          }
        end)

        """
        WE GOT OURSELVES A PUSH!
        #{winners |> Enum.map(&"<@#{&1.player_id}>") |> Enum.join(" , ")}
        KEEP GOING!
        """
    end
  end

  def join(user_id) do
    Logger.info("Player #{user_id} joining")

    Agent.update(GameState, fn state ->
      %{state | player_queue: MapSet.put(state.player_queue, user_id)}
    end)
  end

  def leave(user_id) do
    Logger.info("Player #{user_id} leaving")

    Agent.update(GameState, fn state ->
      %{state | player_queue: MapSet.delete(state.player_queue, user_id)}
    end)
  end

  # Utility Functions

  def game_from_queue(player_queue) do
    player_queue
    |> MapSet.to_list()
    |> Enum.map(&%{player_id: &1, score: nil})
  end
end
