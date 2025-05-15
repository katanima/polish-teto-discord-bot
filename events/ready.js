export const name = 'ready';
export const once = true;

export function execute(client) {
  console.log(`<<< zalogowano jako ${client.user.tag} >>>\n`);
}