defmodule Ceelo.Bot do
  use Slack

  def handle_event(message = %{type: "message"}, slack, state) do
    if message.text =~ "idiot" do
      send_message("I AM IDIOT", message.channel, slack)
    end

    {:ok, state}
  end
end
