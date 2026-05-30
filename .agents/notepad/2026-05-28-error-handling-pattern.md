# Error Handling Pattern: Avoid `any` and Single-Letter Names

## Issue

Inconsistent error handling in catch blocks:

**WRONG** (apps/events/app/event/edit/[id].tsx:52):
```tsx
catch (e: any) {
  Alert.alert('Error', e?.message ?? 'Failed to update event');
}
```

Problems:
1. Single-letter name `e` is not descriptive
2. `any` type loses all safety — bypasses TypeScript
3. No handling for non-Error values (only checks `.message` via optional chain)

**RIGHT** (apps/events/app/circle/new.tsx:21):
```tsx
catch (error) {
  Alert.alert(
    'Error',
    error instanceof Error ? (error?.message ?? 'Failed to create circle') : 'Unknown error'
  );
  setLoading(false);
}
```

Benefits:
1. Descriptive name: `error`
2. Type narrowing with `instanceof Error`
3. Explicitly handles non-Error values
4. TypeScript knows `.message` is safe after the check

**ALSO RIGHT** (apps/events/components/invite-friend-sheet.tsx:65):
```tsx
catch (_error) {
  if (_error instanceof Error) {
    return setError(_error?.message ?? 'Failed to invite');
  }
  setError(`Unknown error: ${_error}`);
}
```

Alternative using early return and explicit fallback.

## Pattern

Always use:
```tsx
catch (error) {
  if (error instanceof Error) {
    // handle Error case
  } else {
    // handle non-Error case (e.g., string thrown, null, etc.)
  }
}
```

Or with ternary for simple cases:
```tsx
catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // use message
}
```

## Why

- `error instanceof Error` is type-safe and matches how JS actually throws errors
- Handles edge cases where non-Error values are thrown
- Descriptive names make intent clear
- No `any` type escape hatches
