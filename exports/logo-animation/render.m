#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <AppKit/AppKit.h>
#import <ImageIO/ImageIO.h>

// Compile using clang with Foundation, AVFoundation, AppKit and ImageIO frameworks.
int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 3) { fprintf(stderr, "Usage: render input.png output.mp4\n"); return 1; }
    NSURL *input = [NSURL fileURLWithPath:@(argv[1])];
    NSURL *output = [NSURL fileURLWithPath:@(argv[2])];
    NSImage *image = [[NSImage alloc] initWithContentsOfURL:input];
    CGImageRef original = [image CGImageForProposedRect:NULL context:nil hints:nil];
    if (!original) { fprintf(stderr, "Cannot load image\n"); return 1; }
    CGImageRef logo = CGImageCreateWithImageInRect(original, CGRectMake(14, 21, 548, 982));
    const int width = 1080, height = 1920, fps = 30, seconds = 6;
    NSError *error = nil;
    AVAssetWriter *writer = [[AVAssetWriter alloc] initWithURL:output fileType:AVFileTypeMPEG4 error:&error];
    if (!writer) { NSLog(@"%@", error); return 1; }
    writer.shouldOptimizeForNetworkUse = YES;
    AVAssetWriterInput *track = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:@{
      AVVideoCodecKey: AVVideoCodecTypeH264, AVVideoWidthKey: @(width), AVVideoHeightKey: @(height),
      AVVideoCompressionPropertiesKey: @{AVVideoAverageBitRateKey: @8000000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel}
    }];
    AVAssetWriterInputPixelBufferAdaptor *adaptor = [AVAssetWriterInputPixelBufferAdaptor
      assetWriterInputPixelBufferAdaptorWithAssetWriterInput:track sourcePixelBufferAttributes:@{
        (NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32ARGB),
        (NSString *)kCVPixelBufferWidthKey: @(width), (NSString *)kCVPixelBufferHeightKey: @(height),
        (NSString *)kCVPixelBufferCGImageCompatibilityKey: @YES,
        (NSString *)kCVPixelBufferCGBitmapContextCompatibilityKey: @YES
      }];
    [writer addInput:track];
    if (![writer startWriting]) { NSLog(@"%@", writer.error); return 1; }
    [writer startSessionAtSourceTime:kCMTimeZero];
    CGColorSpaceRef colors = CGColorSpaceCreateDeviceRGB();
    for (int frame = 0; frame < fps * seconds; frame++) {
      @autoreleasepool {
        while (!track.readyForMoreMediaData) {
          if (writer.status == AVAssetWriterStatusFailed) { NSLog(@"%@", writer.error); return 1; }
          [NSThread sleepForTimeInterval:0.005];
        }
        CVPixelBufferRef buffer = NULL;
        if (CVPixelBufferPoolCreatePixelBuffer(NULL, adaptor.pixelBufferPool, &buffer) != kCVReturnSuccess) return 1;
        CVPixelBufferLockBaseAddress(buffer, 0);
        CGContextRef context = CGBitmapContextCreate(CVPixelBufferGetBaseAddress(buffer), width, height, 8,
          CVPixelBufferGetBytesPerRow(buffer), colors, kCGImageAlphaNoneSkipFirst);
        CGContextSetRGBFillColor(context, 1, 1, 1, 1);
        CGContextFillRect(context, CGRectMake(0, 0, width, height));
        double phase = (double)frame / (fps * seconds) * 2 * M_PI;
        double scale = MIN((double)width / CGImageGetWidth(logo), (double)height / CGImageGetHeight(logo)) * (0.91 + 0.015 * sin(phase));
        double w = CGImageGetWidth(logo) * scale, h = CGImageGetHeight(logo) * scale;
        CGContextTranslateCTM(context, width / 2.0 + 8 * sin(phase), height / 2.0 + 14 * sin(phase));
        CGContextRotateCTM(context, 0.018 * sin(phase));
        CGContextSetInterpolationQuality(context, kCGInterpolationHigh);
        CGContextDrawImage(context, CGRectMake(-w / 2, -h / 2, w, h), logo);
        if (frame == 0) {
          CGImageRef preview = CGBitmapContextCreateImage(context);
          NSURL *path = [[output URLByDeletingLastPathComponent] URLByAppendingPathComponent:@"vorschau.png"];
          CGImageDestinationRef dest = CGImageDestinationCreateWithURL((__bridge CFURLRef)path, CFSTR("public.png"), 1, NULL);
          CGImageDestinationAddImage(dest, preview, NULL);
          if (!CGImageDestinationFinalize(dest)) return 1;
          CFRelease(dest); CGImageRelease(preview);
        }
        CGContextRelease(context);
        CVPixelBufferUnlockBaseAddress(buffer, 0);
        BOOL ok = [adaptor appendPixelBuffer:buffer withPresentationTime:CMTimeMake(frame, fps)];
        CVPixelBufferRelease(buffer);
        if (!ok) { NSLog(@"%@", writer.error); return 1; }
      }
    }
    [track markAsFinished];
    [writer endSessionAtSourceTime:CMTimeMake(seconds, 1)];
    dispatch_semaphore_t done = dispatch_semaphore_create(0);
    [writer finishWritingWithCompletionHandler:^{ dispatch_semaphore_signal(done); }];
    dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
    CGImageRelease(logo); CGColorSpaceRelease(colors);
    if (writer.status != AVAssetWriterStatusCompleted) { NSLog(@"%@", writer.error); return 1; }
    printf("MP4 exported: %s (1080x1920, 30 fps, 6 seconds)\n", argv[2]);
  }
  return 0;
}
