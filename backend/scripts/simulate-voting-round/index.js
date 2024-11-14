import { simulateVotingRound } from "./simulate-voting-round.js";
const args = process.argv.slice(2);
const options = {};
args.forEach((arg, index) => {
  if (arg.startsWith("--")) {
    const [key, value] = arg.split("=");
    options[key.replace("--", "")] = value || true; // Handle flags with or without values
  }
});
await simulateVotingRound(process.argv.slice(2)[0], options);
