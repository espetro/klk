// Native realm setup: RN has no global crypto — noble/nostr calls
// crypto.getRandomValues at key generation + seal time.
import "react-native-get-random-values";
