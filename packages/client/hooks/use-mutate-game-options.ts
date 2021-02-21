import { useMutation } from "react-query";
import { Domain } from '@sonq/api'

const useMutateGameOptions = (gameId: string) => useMutation(async (options: Domain.GameOptions) => {
  const response = await fetch(`http://localhost:4000/game/${gameId}/options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options),
  })
  const json = await response.json();
  return json as Domain.GameOptions;
})

export default useMutateGameOptions;