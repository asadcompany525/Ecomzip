let _ctx: Record<string, any> | null = null;

export const setChatProductContext = (ctx: Record<string, any> | null) => {
  _ctx = ctx;
};

export const getChatProductContext = (): Record<string, any> | null => {
  return _ctx;
};
