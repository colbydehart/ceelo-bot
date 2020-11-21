import Config

config :ceelo,
  slack_access_token: System.fetch_env!("SLACK_ACCESS_TOKEN")
