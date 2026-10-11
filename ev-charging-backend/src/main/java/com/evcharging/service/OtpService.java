package com.evcharging.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final JavaMailSender mailSender;

    // key = userId, value = [otp, expiry]
    private final Map<Long, OtpEntry> otpStore = new ConcurrentHashMap<>();

    public void generateAndSend(Long userId, String toEmail) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        otpStore.put(userId, new OtpEntry(otp, LocalDateTime.now().plusMinutes(5)));
SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(toEmail);
        msg.setSubject("EV Charging - Booking OTP");
        msg.setText(
            "Your OTP for confirming the EV charger booking is:\n\n" +
            "  " + otp + "\n\n" +
            "This OTP is valid for 5 minutes.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "— Smart EV Charging System"
        );
        mailSender.send(msg);
    }

    public boolean verify(Long userId, String inputOtp) {
        OtpEntry entry = otpStore.get(userId);
        if (entry == null) return false;
        if (LocalDateTime.now().isAfter(entry.expiry())) {
            otpStore.remove(userId);
            return false;
        }
        if (entry.otp().equals(inputOtp)) {
            otpStore.remove(userId);
            return true;
        }
        return false;
    }

    record OtpEntry(String otp, LocalDateTime expiry) {}
}
