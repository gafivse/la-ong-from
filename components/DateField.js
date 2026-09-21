"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parseDateInput } from "../lib/date-input";

const theme = createTheme({
  palette: {
    primary: { main: "#00a875" },
    text: { primary: "#263a32", secondary: "#697b6c" },
  },
  typography: { fontFamily: '"Prompt", sans-serif', fontSize: 14 },
  shape: { borderRadius: 8 },
});
const paperSx = {
  borderRadius: "14px",
  border: "1px solid #edf0ed",
  boxShadow: "0 16px 48px #15291f24",
  "& .MuiDateCalendar-root": { width: 320, maxWidth: "calc(100vw - 32px)" },
  "& .MuiPickersCalendarHeader-root": { marginTop: "18px" },
  "& .MuiPickersDay-root": { fontSize: "13px" },
};

export default function DateField({ label, value, onChange, required }) {
  const inputRef = useRef(null);
  const [date, setDate] = useState(() => (value ? dayjs(value) : null));
  const [error, setError] = useState(null);
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      error
        ? "กรุณากรอกวันที่ให้ถูกต้องในรูปแบบ DD/MM/YYYY (ค.ศ.)"
        : required && !date
          ? "กรุณาระบุวันที่"
          : "",
    );
  }, [error, date, required]);

  return (
    <div className="field mui-date-field">
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
          <DatePicker
            label={label.replace(/\s*\*$/, "")}
            value={date}
            format="DD/MM/YYYY"
            enableAccessibleFieldDOMStructure={false}
            inputRef={inputRef}
            minDate={dayjs("2000-01-01").year(1)}
            maxDate={dayjs("9999-12-31")}
            onChange={(next, context) => {
              setDate(next);
              setError(context.validationError);
              onChange(
                next?.isValid() && !context.validationError
                  ? parseDateInput(next.format("DD/MM/YYYY"))
                  : "",
              );
            }}
            onError={setError}
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                required,
                error: Boolean(error),
                helperText: error
                  ? "วันที่ไม่ถูกต้อง กรุณาใช้ DD/MM/YYYY"
                  : undefined,
                sx: {
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    fontSize: "16px",
                  },
                  "& .MuiOutlinedInput-input": {
                    minHeight: 0,
                    height: "24px",
                    padding: "10px 12px",
                    border: 0,
                    borderRadius: 0,
                    background: "transparent",
                    boxShadow: "none",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#a4afa8",
                  },
                  "& .MuiInputLabel-root": { fontSize: "15px" },
                },
              },
              desktopPaper: { sx: paperSx },
              mobilePaper: { sx: paperSx },
              popper: { "data-farm-date-picker": true },
              dialog: { "data-farm-date-picker": true },
              actionBar: { actions: ["clear", "today", "accept"] },
            }}
            localeText={{
              clearButtonLabel: "ล้าง",
              todayButtonLabel: "วันนี้",
              okButtonLabel: "ตกลง",
              cancelButtonLabel: "ยกเลิก",
              openDatePickerDialogue: () =>
                `เลือก${label.replace(/\s*\*$/, "")}จากปฏิทิน`,
            }}
          />
        </LocalizationProvider>
      </ThemeProvider>
    </div>
  );
}
