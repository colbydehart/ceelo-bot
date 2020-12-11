defmodule Ceelo.Router do
  use Plug.Router
  require Logger
  alias Ceelo.Handler

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
        Handler.handle_message_event(event)
        send_resp(conn, 200, "")

      %{"event" => %{"type" => "reaction_added"} = event} ->
        Handler.handle_reaction_added(event)
        send_resp(conn, 200, "")

      %{"event" => %{"type" => "reaction_removed"} = event} ->
        Handler.handle_reaction_removed(event)
        send_resp(conn, 200, "")
    end
  end
end
