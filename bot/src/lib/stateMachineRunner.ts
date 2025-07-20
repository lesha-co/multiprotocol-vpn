export type State = { id: string; transitions: string; parameters?: any };

type RuntimeState<States extends State> = {
  [K in ExtractStateIds<States>]: Extract<States, { id: K }> extends {
    parameters: infer P;
  }
    ? { id: K; parameters: P }
    : { id: K; parameters?: never };
}[ExtractStateIds<States>];

type ExtractStateIds<States extends State> = States extends {
  id: infer Id;
}
  ? Id
  : never;

type GetParameters<States extends State, K> =
  Extract<States, { id: K }> extends { parameters: infer P } ? P : undefined;

type GetTransitions<States extends State, K> =
  Extract<States, { id: K }> extends { transitions: infer T } ? T : never;

export type StateMachine<States extends State, Context> = {
  states: {
    [K in ExtractStateIds<States>]: (
      context: Context,
      parameters: GetParameters<States, K>,
    ) => Promise<
      Extract<RuntimeState<States>, { id: GetTransitions<States, K> }>
    >;
  };
  rootState: RuntimeState<States>;
};

export async function executeStateMachine<States extends State, Context>(
  stateMachine: StateMachine<States, Context>,
  context: Context,
) {
  let currentState = stateMachine.rootState;

  while (true) {
    const stateFunction = stateMachine.states[currentState.id];
    const parameters =
      "parameters" in currentState ? currentState.parameters : undefined;

    currentState = await stateFunction(
      context,
      parameters as GetParameters<States, typeof currentState.id>,
    );
  }
}
