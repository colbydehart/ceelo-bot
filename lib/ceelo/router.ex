defmodule Ceelo.Router do
  use Plug.Router
  require Logger
  alias Ceelo.GameState
  alias Ceelo.Slack

  plug(:match)

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  )

  plug(:dispatch)

  def init(options) do
    Logger.info("Bot starting...")
    options
  end

  get "/" do
    send_resp(conn, 200, "")
  end

  post "/slack/events" do
    IO.inspect(conn)

    case conn.params do
      %{"challenge" => challenge} ->
        send_resp(conn, 200, challenge)

      %{"event" => %{"type" => "message"} = event} ->
        handle_message_event(event)
        send_resp(conn, 200, "")

      %{"event" => %{"type" => "reaction_added"} = event} ->
        handle_reaction_added(event)
        send_resp(conn, 200, "")

      %{"event" => %{"type" => "reaction_removed"} = event} ->
        handle_reaction_removed(event)
        send_resp(conn, 200, "")
    end
  end

  def handle_message_event(event) do
    cond do
      event["text"] =~ ~r/idiot/ ->
        Slack.say("I AM IDIOT", event["channel"])

      event["text"] =~ ~r/roll/i && event["user"] == GameState.current_player() ->
        GameState.roll()
        |> Slack.say(event["channel"])

      event["text"] =~ ~r/play/ ->
        # If there is not a game started, start one
        if not GameState.created?() do
          {:ok, msg} =
            Slack.say(
              """
              STARTING CEELO. U REACT TO THIS WITH EMOJI TO PLAY.
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
