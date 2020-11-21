defmodule Ceelo.SlackServer do
  use GenServer

  @doc false
  def start_link(_) do
    GenServer.start_link(__MODULE__, %{bot_pid: nil}, name: __MODULE__)
  end

  @impl true
  def init(state) do
    {:ok, access_token} = Application.fetch_env(:ceelo, :slack_access_token)
    IO.inspect(access_token)
    {:ok, bot_pid} = Slack.Bot.start_link(Ceelo.Bot, [], access_token)

    {:ok, %{state | bot_pid: bot_pid}}
  end
end
