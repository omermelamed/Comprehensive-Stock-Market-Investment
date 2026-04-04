# API and contracts

## API style

Use boring, explicit JSON contracts that are easy for a local React client to consume.

## Contract rules

- keep request and response DTOs separate from jOOQ records
- prefer stable field names over clever nesting
- send domain values in a frontend-friendly shape
- include both raw values and display-relevant flags when that reduces duplicated UI logic

## Monthly flow contract idea

A preview response can contain:
- portfolio total
- monthly budget
- remaining unallocated amount
- list of position cards

Each card can contain:
- symbol and label
- target percentage and current percentage
- gap percentage and gap value
- suggested amount
- status such as `UNDERWEIGHT`, `ON_TARGET`, or `OVERWEIGHT`
- optional metrics summary and optional AI summary

## Validation boundary

The frontend can calculate provisional totals for responsiveness, but the backend must validate the final submitted allocation.

## Versioning stance

Because this is a local single-user app, prefer straightforward evolution over formal public API versioning. Still, avoid gratuitous contract churn that forces needless frontend rewrites.
