# Member Addresses Component

This document describes the `components/dashboard/member/addresses/` component, which is responsible for managing member addresses within the dashboard.

## Overview

The `components/dashboard/member/addresses/` component provides a user interface for members to view, add, edit, and delete their addresses. It interacts with the backend to persist address information.

## Component Tree

The component tree structure is as follows:

\`\`\`
components/
└── dashboard/
    └── member/
        └── addresses/
            ├── AddressList.js          # Displays a list of addresses
            ├── AddressForm.js          # Form for adding/editing addresses
            ├── AddressItem.js          # Individual address item
            └── index.js                # Main entry point for the component
\`\`\`

## Key Components

*   **AddressList.js:** This component fetches and displays a list of addresses associated with the current member. It also provides functionality to add new addresses and edit existing ones.

*   **AddressForm.js:** This component provides a form for adding new addresses or editing existing ones. It includes fields for address line 1, address line 2, city, state, zip code, and country.

*   **AddressItem.js:** This component renders a single address item in the list. It displays the address details and provides options to edit or delete the address.

## Usage

To use the `components/dashboard/member/addresses/` component, import it into your desired component and render it.

\`\`\`javascript
import AddressList from 'components/dashboard/member/addresses/AddressList';

function MyComponent() {
  return (
    <div>
      <h2>My Addresses</h2>
      <AddressList />
    </div>
  );
}
\`\`\`

## API Endpoints

The `components/dashboard/member/addresses/` component interacts with the following API endpoints:

*   `GET /api/member/addresses`: Retrieves a list of addresses for the current member.
*   `POST /api/member/addresses`: Creates a new address for the current member.
*   `PUT /api/member/addresses/:id`: Updates an existing address for the current member.
*   `DELETE /api/member/addresses/:id`: Deletes an address for the current member.

## State Management

The component uses state management (e.g., React Context, Redux) to manage the list of addresses and the form state.

## Future Enhancements

*   Implement address validation.
*   Add support for default addresses.
*   Improve the user interface.
