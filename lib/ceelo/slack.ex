defmodule Ceelo.Slack do
  require Logger

  @api_uri "https://slack.com/api/chat.postMessage"
  @token Application.get_env(:ceelo, :slack_token)

  def say(txt, chnl) do
    Logger.info("Saying: #{txt}")

    res =
      HTTPoison.post!(
        @api_uri,
        Jason.encode!(%{
          token: @token,
          channel: chnl,
          text: txt
        }),
        [
          {"content-type", "application/json"},
          {"authorization", "Bearer #{@token}"}
        ]
      )

    Logger.info(res)

    Jason.decode(res.body)
  end
end
