// The app's shared realm — every export below delegates to one default
// createRealm() instance, so `import { connect } from "@klk/core"` keeps
// working unchanged. Tools that need several in-process clients (the sim
// harness, multi-actor tests) call createRealm() per actor instead.
import { createRealm } from "./realm.ts";

export * from "./realm.ts";

const realm = createRealm();

export const $identity = realm.$identity;
export const $circles = realm.$circles;
export const $events = realm.$events;
export const $rsvps = realm.$rsvps;
export const $suggestions = realm.$suggestions;
export const $profiles = realm.$profiles;
export const $contacts = realm.$contacts;
export const $connected = realm.$connected;
export const connect = realm.connect;
export const disconnect = realm.disconnect;
export const createCircle = realm.createCircle;
export const inviteLinkFor = realm.inviteLinkFor;
export const joinCircle = realm.joinCircle;
export const discoverCircles = realm.discoverCircles;
export const postEvent = realm.postEvent;
export const setRsvp = realm.setRsvp;
export const suggestChange = realm.suggestChange;
export const applySuggestion = realm.applySuggestion;
export const grantAgentScope = realm.grantAgentScope;
export const sealFor = realm.sealFor;
export const openFor = realm.openFor;
export const fetchProfiles = realm.fetchProfiles;
export const publishProfile = realm.publishProfile;
export const addContact = realm.addContact;
export const removeContact = realm.removeContact;
export const displayName = realm.displayName;
