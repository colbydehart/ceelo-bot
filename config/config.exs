import Config

config :ceelo,
  slack_token: System.fetch_env!("SLACK_TOKEN"),
  slack_secret: System.fetch_env!("SLACK_SECRET"),
  port: String.to_integer(System.get_env("PORT", "3000"))
