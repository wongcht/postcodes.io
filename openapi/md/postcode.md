### Postcode Data

Lookup a UK postcode against the ONS Postcode Directory (ONSPD). The response is a fully resolved record — every administrative, electoral, statistical and health geography that ONSPD ships for the postcode is returned at the top level by its human-readable name, with the equivalent GSS / official codes mirrored under the `codes` object.

The same shape is returned by `/postcodes` (bulk + search), `/outcodes` (aggregated across an outward code), and the reverse-geocoding endpoints.

Returns `404` if the postcode does not exist or is not valid.
