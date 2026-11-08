# Acceptance specification. Automated evidence: tests/integration/local-completion.mjs
@US02 @TS02
Feature: Read the signed-in user's identity

  Scenario: Authorized or healthy request
    Given a user signed in with Better Auth and obtained an access token
    When the client requests GET /api/v1/iam/me
    Then the response status is 200
    And the response identifies the signed-in user

  Scenario: Boundary or access control
    Given the review environment is available
    When the request omits the access token
    Then the response status is 401
    And the profile is not returned
