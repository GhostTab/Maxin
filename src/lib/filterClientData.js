/**
 * Filter submission data so a client sees only their own records.
 * Matches by client email (Client_Info col_7) === userEmail.
 * Policies shown are those where Insured Name (col_2) matches one of the client's Full Names (col_1).
 */

export function filterDataByClientEmail(data, userEmail) {
  if (!data || !userEmail) return data
  const email = String(userEmail).trim().toLowerCase()
  const clientInfo = Array.isArray(data.client_info) ? data.client_info : []
  const policyInfo = Array.isArray(data.policy_info) ? data.policy_info : []

  const myClients = clientInfo.filter((row) => String(row?.col_7 ?? '').trim().toLowerCase() === email)
  const myClientNames = new Set(myClients.map((row) => String(row?.col_1 ?? '').trim()).filter(Boolean))
  const myPolicies = policyInfo.filter((row) => myClientNames.has(String(row?.col_2 ?? '').trim()))

  return {
    ...data,
    client_info: myClients,
    policy_info: myPolicies,
  }
}
