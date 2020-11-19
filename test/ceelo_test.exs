defmodule CeeloTest do
  use ExUnit.Case
  doctest Ceelo

  test "greets the world" do
    assert Ceelo.hello() == :world
  end
end
