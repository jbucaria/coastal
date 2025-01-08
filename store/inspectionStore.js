// store/inspectionStore.js

import { create } from 'zustand'

const useInspectionStore = create(set => ({
  reports: [],
  setReports: reports => set({ reports }),
  toggleRemediationRequired: reportId =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId
          ? { ...report, remediationRequired: !report.remediationRequired }
          : report
      ),
    })),
  setEquipmentOnSite: (reportId, value) =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId ? { ...report, equipmentOnSite: value } : report
      ),
    })),
  toggleSiteComplete: reportId =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId
          ? { ...report, siteComplete: !report.siteComplete }
          : report
      ),
    })),
  updateReportStatus: (reportId, statusUpdate) =>
    set(state => ({
      reports: state.reports.map(report =>
        report.id === reportId ? { ...report, ...statusUpdate } : report
      ),
    })),
}))

export default useInspectionStore
