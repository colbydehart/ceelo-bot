alias Ceelo.GameState
alias Ceelo.Slack

defmodule Ceelo.Handler do
  def handle_message_event(event) do
    cond do
      event["text"] =~ ~r/idiot/ ->
        Slack.say("I AM IDIOT", event["channel"])

      event["text"] =~ ~r/reset/ ->
        Agent.update(GameState, fn state ->
          %{state | current_player: nil, game: nil, message_timestamp: nil, player_queue: nil}
        end)

      event["text"] =~ ~r/roll/i && event["user"] == GameState.current_player() ->
        GameState.roll()
        |> Slack.say(event["channel"])

      event["text"] =~ ~r/play/i ->
        # If there is not a game started, start one
        if not GameState.created?() do
          {:ok, msg} =
            Slack.say(
              """
              STARTING CEELO. U REACT TO THIS WITH EMOJI TO JOIN.
              <@#{event["user"]}> IS UP FIRST.
              """,
              event["channel"]
            )

          GameState.create_game(msg["ts"], event["user"])
        end

      true ->
        nil
    end
  end

  def handle_reaction_added(event) do
    if event["item"]["ts"] == GameState.message_timestamp() do
      GameState.join(event["user"])
    end
  end

  def handle_reaction_removed(event) do
    if event["item"]["ts"] == GameState.message_timestamp() do
      GameState.leave(event["user"])
    end
  end
end
