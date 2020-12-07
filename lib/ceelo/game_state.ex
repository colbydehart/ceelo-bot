defmodule Ceelo.GameState do
  use Agent
  alias Ceelo.GameState
  require Logger

  @dice [1, 2, 3, 4, 5, 6]

  @type dice_roll ::
          :one_two_three
          | :four_five_six
          | :muffins
          | {:double, integer(), integer()}
          | {:triple, integer()}

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

  def game_over?(), do: Agent.get(GameState, fn 
    %{game: nil} -> false
    %{game: game} -> Enum.any?(game, &(&1.score == :four_five_six)) or Enum.all?(game, &(&1.score != nil))
  end)

  def get_winner(), do: Agent.get(GameState, fn 
    %{game: nil} -> nil
    %{game: game} ->
      game
      |> Enum.sort_by(&score_to_number(&1.score))
      |> Enum.reverse()
      |> List.first()
  end)

  def score_to_number(:muffins), do: -1
  def score_to_number(:one_two_three), do: -100
  def score_to_number(:four_five_six), do: 100
  def score_to_number({:double, x, y}), do: x
  def score_to_number({:triple, x}), do: x * 10

  def score_to_text(:muffins), do: "MUFFINS"
  def score_to_text(:one_two_three), do: "ONE TWO THREE U LOSE :("
  def score_to_text(:four_five_six), do: "FOUR FIVE SIX"
  def score_to_text({:double, x, y}), do: "DOUBLE #{y}s WITH A #{x}"
  def score_to_text({:triple, x}), do: "TRIPLE #{x}s"

  def register_score(score) do
    Agent.update(GameState, fn %{current_player: current_player} = state ->
      %{
        state
        # Update the current player's score
        | game:
            state.game
            |> Enum.map(fn 
              turn = %{player_id: ^current_player} -> %{turn| score: score }
              turn -> turn
            end),
          # Set the current player to the next player without a score
        current_player: state.game
          |> Enum.find(&(&1.score == nil && &1.player_id != current_player))
          |> case do
            nil -> nil
            %{player_id: player_id} -> player_id
          end
      }
    end)
  end

  def roll_dice(_) do
    [Enum.random(@dice), Enum.random(@dice), Enum.random(@dice)]
    |> Enum.sort()
    |> case do
      [1, 2, 3] -> :one_two_three
      [4, 5, 6] -> :four_five_six
      [x, x, y] -> {:double, y, x}
      [y, x, x] -> {:double, y, x}
      [x, x, x] -> {:triple, x}
      _ -> :muffins
    end
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
      %{ state | 
        player_queue: nil,
        game: game_from_queue(state.player_queue)      }
    end)
  end

  # Roll the dice, begins game if not yet started.
  def roll(user_id) do
    IO.inspect(Agent.get(GameState, & &1.game))
    if Agent.get(GameState, & &1.game) == nil do
      Logger.info("Beginning the game")
      begin_game()
    end

    rolls =  Enum.map(0..4, &roll_dice/1)

    score = rolls
            |> Enum.find(:muffins, & &1 != :muffins)
    {rolls, rest} = rolls
            |> Enum.split(Enum.find_index(rolls, & &1 == score) + 1)
    Logger.info("score: #{score_to_text(score)}")
    :ok = register_score(score)

    roll_text =  
      rolls
      |> Enum.map(&score_to_text/1)
      |> Enum.join("\n")
    if game_over?() do
      roll_text <> end_game() 
    else
      roll_text <> "\nUP NEXT IS <@#{current_player()}>"
    end
  end

  def end_game() do
    Logger.info("game over")
    winner = get_winner()
    Logger.info("Winner:")
    Logger.info(winner.player_id)
    Agent.update(GameState, fn state -> 
      %{state | current_player: nil, game: nil, message_timestamp: nil, player_queue: nil}
    end)

    "\nGAME IS OVER: <@#{winner.player_id}> is the winner! with #{score_to_text(winner.score)}"
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

