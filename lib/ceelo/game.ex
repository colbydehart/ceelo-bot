defmodule Ceelo.Gameplay do
  @dice [1, 2, 3, 4, 5, 6]

  @type roll ::
          :one_two_three
          | :four_five_six
          | :muffins
          | {:double, integer(), integer()}
          | {:triple, integer()}

  @doc """
  Rolls the best of 5 dice and until a point is made. 
  a tuple of the score and the rolls in order is returned
  """
  @spec get_rolls() :: {roll, [roll]}
  def get_rolls() do
    rolls =
      0..4
      |> Enum.map(&get_dice_roll/1)
      |> Enum.reduce_while([], fn
        :muffins, rolls -> {:cont, [:muffins | rolls]}
        score, rolls -> {:halt, [score | rolls]}
      end)
      |> Enum.reverse()

    {List.last(rolls), rolls}
  end

  @spec get_dice_roll(any) :: roll
  defp get_dice_roll(_) do
    [Enum.random(@dice), Enum.random(@dice), Enum.random(@dice)]
    |> Enum.sort()
    |> case do
      [1, 2, 3] -> :one_two_three
      [4, 5, 6] -> :four_five_six
      [x, x, x] -> {:triple, x}
      [x, x, y] -> {:double, y, x}
      [y, x, x] -> {:double, y, x}
      _ -> :muffins
    end
  end

  @spec roll_to_int(roll()) :: integer()
  def roll_to_int(:muffins), do: -1
  def roll_to_int(:one_two_three), do: -100
  def roll_to_int(:four_five_six), do: 100
  def roll_to_int({:double, x, _}), do: x
  def roll_to_int({:triple, x}), do: x * 10

  @spec roll_to_str(roll()) :: binary()
  def roll_to_str(:muffins), do: "MUFFINS"
  def roll_to_str(:one_two_three), do: "ONE TWO THREE U LOSE :("
  def roll_to_str(:four_five_six), do: "FOUR FIVE SIX"
  def roll_to_str({:double, x, y}), do: "DOUBLE #{y}s WITH A #{x}"
  def roll_to_str({:triple, x}), do: "TRIPLE #{x}s"
end
